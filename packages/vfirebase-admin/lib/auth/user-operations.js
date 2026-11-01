"use strict";
// Source-informed user-management plans. Public diagnostics and wire field
// names retain the Firebase contract; input ownership and result accounting
// belong to these operations instead of the caller's mutable objects.
const validator = require('../utils/validator');
const {FirebaseAuthError, authClientErrorCode: codes} = require('./error');
const {detachClaims} = require('./claim-snapshot');
const {convertMultiFactorInfoToServerFormat} = require('./user-import-builder');

const error = (code, message) => new FirebaseAuthError(code, message);
const maximumBatch = () => error(codes.MAXIMUM_USER_COUNT_EXCEEDED, '`uids` parameter must have <= 1000 entries.');
function snapshot(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const prototype = Object.getPrototypeOf(value);
  if (prototype === Object.prototype || prototype === null) return detachClaims(value);
  // A class instance can supply structural UpdateRequest fields too. Copy its
  // own fields into a plain record before normalizing; never edit the instance.
  return detachClaims(Object.fromEntries(Object.entries(value)));
}
function clientChanges(input) {
  const changes = snapshot(input);
  const provider = changes?.providerToLink;
  const destination = provider?.providerId === 'email' ? 'email' : provider?.providerId === 'phone' ? 'phoneNumber' : undefined;
  if (destination) {
    if (changes[destination] !== undefined) {
      const name = provider.providerId;
      throw error(codes.INVALID_ARGUMENT, `Both UpdateRequest.${destination} and UpdateRequest.providerToLink.providerId='${name}' were set. To ` +
        (name === 'email' ? 'link to the email/password provider, only specify the UpdateRequest.email field.' :
          'link to a phone provider, only specify the UpdateRequest.phoneNumber field.'));
    }
    changes[destination] = provider.uid;
    delete changes.providerToLink;
  }
  if (changes?.providersToUnlink && changes.providersToUnlink.indexOf('phone') !== -1 && changes.phoneNumber === null) {
    throw error(codes.INVALID_ARGUMENT, "Both UpdateRequest.phoneNumber=null and UpdateRequest.providersToUnlink=['phone'] were set. To " +
      'unlink from a phone provider, only specify the UpdateRequest.phoneNumber=null field.');
  }
  return changes;
}

class UserChanges {
  constructor(input) {
    this.values = snapshot(input);
    const {providerToLink: link, providersToUnlink: unlink} = this.values;
    if (validator.isNonNullObject(link)) {
      for (const key of ['providerId', 'uid']) if (!validator.isNonEmptyString(link[key])) {
        throw error(codes.INVALID_ARGUMENT, `providerToLink.${key} of properties argument must be a non-empty string.`);
      }
    }
    if (unlink !== undefined && (!Array.isArray(unlink) || unlink.some(item => !validator.isNonEmptyString(item)))) {
      throw error(codes.INVALID_ARGUMENT, 'providersToUnlink of properties argument must be an array of strings.');
    }
  }
  body(uid) {
    const request = this.values;
    request.localId = uid;
    delete request.deleteAttribute;
    const removed = [];
    for (const [key, field] of [['displayName', 'DISPLAY_NAME'], ['photoURL', 'PHOTO_URL']]) {
      if (request[key] === null) {removed.push(field); delete request[key];}
    }
    if (removed.length) request.deleteAttribute = removed;
    if (request.phoneNumber === null) {
      request.deleteProvider = request.deleteProvider ? [...request.deleteProvider, 'phone'] : ['phone'];
      delete request.phoneNumber;
    }
    if (request.providerToLink !== undefined) {
      const provider = snapshot(request.providerToLink);
      provider.rawId = provider.uid;
      delete provider.uid;
      request.linkProviderUserInfo = provider;
      delete request.providerToLink;
    }
    if (request.providersToUnlink !== undefined) {
      request.deleteProvider = [...(Array.isArray(request.deleteProvider) ? request.deleteProvider : []), ...request.providersToUnlink];
      delete request.providersToUnlink;
    }
    for (const [from, to] of [['photoURL', 'photoUrl'], ['disabled', 'disableUser']]) {
      if (request[from] !== undefined) {request[to] = request[from]; delete request[from];}
    }
    if (validator.isNonNullObject(request.multiFactor)) {
      const factors = request.multiFactor.enrolledFactors;
      if (factors === null || Array.isArray(factors)) {
        request.mfa = {};
        if (factors?.length) request.mfa.enrollments = factors.map(convertMultiFactorInfoToServerFormat);
      }
      delete request.multiFactor;
    }
    return request;
  }
}

class UserRequests {
  constructor(dispatch) {this.dispatch = dispatch;}
  lookup(uid) {
    if (!validator.isUid(uid)) return Promise.reject(error(codes.INVALID_UID));
    return this.dispatch('lookup', {localId: [uid]});
  }
  update(uid, changes) {
    if (!validator.isUid(uid)) return Promise.reject(error(codes.INVALID_UID));
    if (!validator.isNonNullObject(changes)) return Promise.reject(error(codes.INVALID_ARGUMENT, 'Properties argument must be a non-null object.'));
    const plan = new UserChanges(changes);
    let request;
    try {request = plan.body(uid);} catch (failure) {return Promise.reject(failure);}
    return this.dispatch('update', request).then(response => response.localId);
  }
  revoke(uid) {
    if (!validator.isUid(uid)) return Promise.reject(error(codes.INVALID_UID));
    return this.dispatch('update', {localId: uid, validSince: Math.floor(Date.now() / 1000)}).then(response => response.localId);
  }
  delete(uids, force) {
    if (!uids.length) return Promise.resolve({});
    if (uids.length > 1000) throw maximumBatch();
    const localIds = [];
    for (const uid of uids) {
      if (!validator.isUid(uid)) throw error(codes.INVALID_UID);
      localIds.push(uid);
    }
    return this.dispatch('delete', {localIds, force});
  }
}

class UserDeletion {
  #size;
  constructor(uids) {
    if (!Array.isArray(uids)) throw error(codes.INVALID_ARGUMENT, '`uids` parameter must be an array');
    if (uids.length > 1000) throw maximumBatch();
    this.#size = uids.length;
    this.uids = new Array(this.#size);
    for (let index = 0; index < this.#size; index++) this.uids[index] = uids[index];
  }
  complete(response) {
    const failures = response.errors;
    if (failures !== undefined && !Array.isArray(failures)) throw this.corrupt();
    if (!failures?.length) return {failureCount: 0, successCount: this.#size, errors: []};
    const errors = [], seen = new Set();
    for (const failure of failures || []) {
      const index = failure?.index;
      if (!Number.isInteger(index) || index < 0 || index >= this.#size || seen.has(index)) throw this.corrupt();
      if (failure.message !== undefined && typeof failure.message !== 'string') throw this.corrupt();
      seen.add(index);
      const code = typeof failure.message === 'string' && failure.message.startsWith('NOT_DISABLED') ? codes.USER_NOT_DISABLED : codes.INTERNAL_ERROR;
      errors.push({index, error: error(code, failure.message)});
    }
    return {failureCount: errors.length, successCount: this.#size - errors.length, errors};
  }
  corrupt() {return error(codes.INTERNAL_ERROR, 'Corrupt BatchDeleteAccountsResponse detected');}
}
Object.assign(exports, {UserRequests, UserDeletion, clientChanges});

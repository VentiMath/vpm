'use strict';
const logger = require('../../logger/index.js'), app = require('../app.js');
const {dateToTimestampProto} = require('../utilities/encoder.js');
let admin, eventSchema;

// Generated protobuf descriptors are protocol data. Keep them lazy and decode
// one event once when both its before and after snapshots are requested.
class SnapshotMaterializer {
  constructor(data, resource, database, format) {
    this.resource = resource;
    this.format = format;
    admin ??= require('vfirebase-admin/firestore');
    this.store = database ? admin.getFirestore(app.getApp(), database) : admin.getFirestore(app.getApp());
    this.data = format === 'protobufJS'
      ? (eventSchema ??= require('../../../protos/compiledFirestore.js').google.events.cloud.firestore.v1.DocumentEventData).decode(Buffer.from(data))
      : data;
  }
  snapshot(field, createTime, updateTime) {
    const document = this.data?.[field];
    if (this.format === 'protobufJS') return this.store.snapshot_(document || this.resource, null, 'protobufJS');
    const present = document != null && (typeof document !== 'object' || Object.keys(document).length !== 0);
    const value = present ? {fields: document.fields || {}, createTime: dateToTimestampProto(document.createTime),
      updateTime: dateToTimestampProto(document.updateTime), name: document.name || this.resource} : this.resource;
    let time = createTime || updateTime;
    if (!time && field === 'value') {
      logger.warn('Snapshot has no readTime. Using now()');
      time = new Date().toISOString();
    }
    return this.store.snapshot_(value, dateToTimestampProto(time), 'json');
  }
}
function protobufSnapshot(field, data, resource, database) {
  try {return new SnapshotMaterializer(data, resource, database, 'protobufJS').snapshot(field);}
  catch (error) {
    logger.error(`Failed to decode protobuf and create a ${field === 'oldValue' ? 'before snapshot' : 'snapshot'}.`);
    throw error;
  }
}
function createSnapshotPairFromProtobuf(data, resource, database) {
  try {
    const materializer = new SnapshotMaterializer(data, resource, database, 'protobufJS');
    return {before: materializer.snapshot('oldValue'), after: materializer.snapshot('value')};
  } catch (error) {logger.error('Failed to decode protobuf and create snapshots.'); throw error;}
}
module.exports = {
  createSnapshotFromProtobuf: (data, path, database) => protobufSnapshot('value', data, path, database),
  createBeforeSnapshotFromProtobuf: (data, path, database) => protobufSnapshot('oldValue', data, path, database),
  createSnapshotFromJson: (data, path, created, updated, database) => new SnapshotMaterializer(data, path, database, 'json').snapshot('value', created, updated),
  createBeforeSnapshotFromJson: (data, path, created, updated, database) => new SnapshotMaterializer(data, path, database, 'json').snapshot('oldValue', created, updated),
  createSnapshotPairFromProtobuf,
};

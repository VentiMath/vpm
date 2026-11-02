'use strict';

// Independently implemented validation/normalization plan. Field spellings and
// compatibility diagnostics follow the Apache-2.0 Firebase Admin contract.
const {
  FirebaseMessagingError,
  messagingClientErrorCode: codes
} = require('./error');

const {
  isURL
} = require('../utils/validator');

const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const present = (object, key) => own(object, key) && object[key] !== undefined;
const nonempty = value => typeof value === 'string' && value.length > 0;

const fail = text => {
  throw new FirebaseMessagingError(codes.INVALID_PAYLOAD, text);
};

const record = (value, label) => {
  if (value === undefined)
    return false;

  if (!value || typeof value !== 'object' || Array.isArray(value) || (Object.getPrototypeOf(value) !== null && Object.getPrototypeOf(value) !== Object.prototype))
    fail(label + ' must be a non-null object');

  return true;
};

const maps = {
  android: {
    collapseKey: 'collapse_key',
    restrictedPackageName: 'restricted_package_name',
    directBootOk: 'direct_boot_ok',
    bandwidthConstrainedOk: 'bandwidth_constrained_ok',
    restrictedSatelliteOk: 'restricted_satellite_ok'
  },

  notification: {
    clickAction: 'click_action',
    bodyLocKey: 'body_loc_key',
    bodyLocArgs: 'body_loc_args',
    titleLocKey: 'title_loc_key',
    titleLocArgs: 'title_loc_args',
    channelId: 'channel_id',
    imageUrl: 'image',
    eventTimestamp: 'event_time',
    localOnly: 'local_only',
    priority: 'notification_priority',
    vibrateTimingsMillis: 'vibrate_timings',
    defaultVibrateTimings: 'default_vibrate_timings',
    defaultSound: 'default_sound',
    lightSettings: 'light_settings',
    defaultLightSettings: 'default_light_settings',
    notificationCount: 'notification_count'
  },

  alert: {
    locKey: 'loc-key',
    locArgs: 'loc-args',
    titleLocKey: 'title-loc-key',
    titleLocArgs: 'title-loc-args',
    subtitleLocKey: 'subtitle-loc-key',
    subtitleLocArgs: 'subtitle-loc-args',
    actionLocKey: 'action-loc-key',
    launchImage: 'launch-image'
  },

  aps: {
    contentAvailable: 'content-available',
    mutableContent: 'mutable-content',
    threadId: 'thread-id'
  }
};

// Compile immutable field-name tables once, not once per recipient.
maps.image = {imageUrl: 'image'};
maps.apns = {liveActivityToken: 'live_activity_token'};
maps.light = {lightOnDurationMillis: 'light_on_duration', lightOffDurationMillis: 'light_off_duration'};
for (const key of Object.keys(maps)) maps[key] = Object.entries(maps[key]);
const targets = ['fid', 'token', 'topic', 'condition'];
const androidLocalization = [['bodyLocArgs', 'bodyLocKey'], ['titleLocArgs', 'titleLocKey']];
const alertLocalization = [['locArgs', 'locKey'], ['titleLocArgs', 'titleLocKey'], ['subtitleLocArgs', 'subtitleLocKey']];
const apsFlags = [['contentAvailable', 'content-available'], ['mutableContent', 'mutable-content']];

function stringMap(value, label) {
  if (!record(value, label))
    return;

  for (const key of Object.keys(value)) if (typeof value[key] !== 'string')
    fail(label + ' must only contain string values');
}

function image(value, label) {
  if (value !== undefined && !isURL(value))
    fail(label + ' must be a valid URL string');
}

function analytics(value) {
  if (!record(value, 'fcmOptions'))
    return;

  if (present(value, 'analyticsLabel') && typeof value.analyticsLabel !== 'string')
    fail('analyticsLabel must be a string value');
}

function localized(value, prefix, pairs) {
  for (const [args, key] of pairs) if (Array.isArray(value[args]) && value[args].length && !nonempty(value[key]))
    fail(prefix + '.' + key + ' is required when specifying ' + args);
}

function duration(value, label) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0)
    fail(label);

  const seconds = Math.floor(value / 1000), fraction = Math.round((value - seconds * 1000) * 1e6);
  return fraction === 0 ? seconds + 's' : fraction === 1000000000 ? seconds + 1 + 's' : seconds + '.' + String(fraction).padStart(9, '0') + 's';
}

function validateMessage(message) {
  if (!record(message, 'Message'))
    fail('Message must be a non-null object');

  const edits = [];

  const put = (o, k, v) => edits.push(() => Object.defineProperty(o, k, {
    value: v,
    enumerable: true,
    writable: true,
    configurable: true
  }));

  const remove = (o, k) => edits.push(() => {
    delete o[k];
  });

  // Validate every branch before changing the owned request snapshot. Rejection
  // never leaves an earlier branch partially converted to wire field names.
  const rename = (o, mapping, label, converted = {}) => {
    for (const [from, to] of mapping) if (present(o, from)) {
      if (own(o, to))
        fail(`Multiple specifications for ${from} in ${label}`);

      put(o, to, own(converted, from) ? converted[from] : o[from]);
      remove(o, from);
    }
  };

  const topic = own(message, 'topic') ? message.topic : undefined;

  if (topic) {
    if (typeof topic !== 'string')
      fail('Malformed topic name');

    const normalized = topic.startsWith('/topics/') ? topic.slice(8) : topic;

    if (!/^[a-zA-Z0-9_.~%-]+$/.test(normalized))
      fail('Malformed topic name');

    put(message, 'topic', normalized);
  }

  let targetCount = 0;
  for (const key of targets) if (own(message, key) && nonempty(message[key])) targetCount++;
  if (targetCount !== 1)
    fail('Exactly one of fid, topic, token or condition is required');

  stringMap(message.data, 'data');
  const android = message.android;

  if (record(android, 'android')) {
    if (present(android, 'ttl'))
      put(android, 'ttl', duration(android.ttl, 'TTL must be a non-negative duration in milliseconds'));

    stringMap(android.data, 'android.data');
    analytics(android.fcmOptions);
    const n = android.notification;

    if (record(n, 'android.notification')) {
      if (present(n, 'color') && (typeof n.color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(n.color)))
        fail('android.notification.color must be in the form #RRGGBB');

      localized(n, 'android.notification', androidLocalization);
      image(n.imageUrl, 'android.notification.imageUrl');
      const converted = {};

      if (present(n, 'eventTimestamp')) {
        if (!(n.eventTimestamp instanceof Date) || !Number.isFinite(n.eventTimestamp.getTime()))
          fail('android.notification.eventTimestamp must be a valid `Date` object');

        converted.eventTimestamp = n.eventTimestamp.toISOString();
      }

      if (present(n, 'vibrateTimingsMillis')) {
        const times = n.vibrateTimingsMillis;

        if (!Array.isArray(times) || !times.length)
          fail('android.notification.vibrateTimingsMillis must be a non-empty array of numbers');

        converted.vibrateTimingsMillis = Array.from(
          times,
          value => duration(value, 'android.notification.vibrateTimingsMillis must be non-negative durations in milliseconds')
        );
      }

      for (const key of ['priority', 'proxy', 'visibility']) if (present(n, key)) {
        if (typeof n[key] !== 'string')
          fail('android.notification.' + key + ' must be a string value');

        const value = (key === 'priority' ? 'PRIORITY_' : '') + n[key].toUpperCase();

        if (key === 'priority')
          converted[key] = value;
        else
          put(n, key, value);
      }

      const light = n.lightSettings;

      if (record(light, 'android.notification.lightSettings')) {
        const on = duration(
          light.lightOnDurationMillis,
          'android.notification.lightSettings.lightOnDurationMillis must be a non-negative duration in milliseconds'
        );

        const off = duration(
          light.lightOffDurationMillis,
          'android.notification.lightSettings.lightOffDurationMillis must be a non-negative duration in milliseconds'
        );

        if (typeof light.color !== 'string' || !/^#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?$/.test(light.color))
          fail('android.notification.lightSettings.color must be in the form #RRGGBB or #RRGGBBAA format');

        const rgba = light.color.length === 7 ? light.color + 'ff' : light.color, color = {};

        ['red', 'green', 'blue', 'alpha'].forEach((key, i) => {
          color[key] = parseInt(rgba.slice(1 + i * 2, 3 + i * 2), 16) / 255;
        });

        put(light, 'color', color);

        rename(light, maps.light, 'LightSettings', {
          lightOnDurationMillis: on,
          lightOffDurationMillis: off
        });
      }

      rename(n, maps.notification, 'AndroidNotification', converted);
    }

    rename(android, maps.android, 'AndroidConfig');
  }

  const web = message.webpush;

  if (record(web, 'webpush')) {
    stringMap(web.headers, 'webpush.headers');
    stringMap(web.data, 'webpush.data');
  }

  const apns = message.apns;

  if (record(apns, 'apns')) {
    if (present(apns, 'liveActivityToken')) {
      if (typeof apns.liveActivityToken !== 'string')
        fail('apns.liveActivityToken must be a string value');

      if (!apns.liveActivityToken.length)
        fail('apns.liveActivityToken must be a non-empty string');
    }

    stringMap(apns.headers, 'apns.headers');

    if (record(apns.payload, 'apns.payload')) {
      const aps = apns.payload.aps;

      if (record(aps, 'apns.payload.aps')) {
        const alert = aps.alert;

        if (alert !== undefined && typeof alert !== 'string') {
          if (!alert || typeof alert !== 'object' || Array.isArray(alert))
            fail('apns.payload.aps.alert must be a string or a non-null object');

          localized(
            alert,
            'apns.payload.aps.alert',
            alertLocalization
          );

          rename(alert, maps.alert, 'ApsAlert');
        }

        const sound = aps.sound;

        if (sound !== undefined && !nonempty(sound)) {
          if (!sound || typeof sound !== 'object' || Array.isArray(sound))
            fail('apns.payload.aps.sound must be a non-empty string or a non-null object');

          if (!nonempty(sound.name))
            fail('apns.payload.aps.sound.name must be a non-empty string');

          if (present(sound, 'volume')) {
            if (typeof sound.volume !== 'number' || !Number.isFinite(sound.volume))
              fail('apns.payload.aps.sound.volume must be a number');

            if (sound.volume < 0 || sound.volume > 1)
              fail('apns.payload.aps.sound.volume must be in the interval [0, 1]');
          }

          if (present(sound, 'critical')) {
            if (sound.critical === true || sound.critical === 1)
              put(sound, 'critical', 1);
            else
              remove(sound, 'critical');
          }
        }

        rename(aps, maps.aps, 'Aps');

        for (const [from, to] of apsFlags) {
          const value = present(aps, from) ? aps[from] : aps[to];

          if (value !== undefined) {
            if (value === true || value === 1)
              put(aps, to, 1);
            else
              remove(aps, to);
          }
        }
      }
    }

    const fcm = apns.fcmOptions;

    if (record(fcm, 'fcmOptions')) {
      image(fcm.imageUrl, 'imageUrl');
      analytics(fcm);

      rename(fcm, maps.image, 'ApnsFcmOptions');
    }

    rename(apns, maps.apns, 'ApnsConfig');
  }

  analytics(message.fcmOptions);

  if (record(message.notification, 'notification')) {
    image(message.notification.imageUrl, 'notification.imageUrl');

    rename(message.notification, maps.image, 'Notification');
  }

  for (const edit of edits)
    edit();
}

exports.validateMessage = validateMessage;
exports.BLACKLISTED_DATA_PAYLOAD_KEYS = ['from'];
exports.BLACKLISTED_OPTIONS_KEYS = ['condition', 'data', 'notification', 'registrationIds', 'registration_ids', 'to'];

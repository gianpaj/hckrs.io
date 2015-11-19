



var eventSchema = new SimpleSchema({ /* events from mandrill (webhook) */
  "event": { type: String }, /* send, deferral, hard-bounce, soft-bounce, open, click, spam, unsub, reject */
  "url": { type: String, optional: true}, /* url clicked in the message */
  "agent": {
    type: new SimpleSchema({
      "mobile": { type: Boolean },
      "os": { type: String, optional: true }, /* linux, mac, windows */
      "client": { type: String, optional: true }, /* Firefox, Chrome, Safari */
      "version": { type: String, optional: true },
    }),
    optional: true
  },
})

Schemas.EmailsOutbound = new SimpleSchema([
  Schemas.default,
  {
    "kind"            : { type: String, optional: true, allowedValues: ['news', 'transactional', 'notification', 'growth'] },
    "type"            : { type: String, optional: true },
    "city"            : { type: String, optional: true, allowedValues: City.identifiers() },
    "from": {
      type: new SimpleSchema({
        "email"       : { type: String },
        "name"        : { type: String, optional: true },
        "userId"      : { type: String, optional: true },
      })
    },
    "to": {
      type: [new SimpleSchema({
        "email"       : { type: String },
        "name"        : { type: String, optional: true },
        "type"        : { type: String, optional: true, allowedValues: ['to','cc','bcc'], defaultValue: 'to' },
        "userId"      : { type: String, optional: true },
        "messageId"   : { type: String, optional: true }, /* ref: Mandrill's message '_id' */
        "events"      : { type: [eventSchema], optional: true } /* events from mandrill (webhook) */
      })]
    },
    "subjectTemplate" : { type: String, optional: true }, /* ref: identifier */
    "bodyTemplate"    : { type: String, optional: true }, /* ref: identifier */
    "subject"         : { type: String, optional: true },
    "body"            : { type: String, optional: true },
    "tags"            : { type: [String], optional: true },
    "mergeVarsGlobal" : { type: [new SimpleSchema({"name": {type: String}, "content": {type: String}})], optional: true },
    "mergeVars": {
      type: [new SimpleSchema({
        "rcpt"        : { type: String },
        "vars"        : { type: [new SimpleSchema({"name": {type: String}, "content": {type: String}})], optional: true },
      })]
    },
  }
]);


EmailsOutbound.attachSchema(Schemas.EmailsOutbound);

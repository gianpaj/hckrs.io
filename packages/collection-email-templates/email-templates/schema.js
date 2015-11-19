



Schemas.EmailTemplates = new SimpleSchema([
  Schemas.default,
  {
    "identifier": { // short name for reference
      type: String,
      label: 'Template Name',
      unique: true,
      autoValue: function() { // value not allowed to update onces setted.
        if (this.isInsert) return this.value;
        if (this.isUpsert) return {$setOnInsert: this.value};
        this.unset();
      }
    },
    "subject": {
      type: String,
      optional: true,
      label: 'Subject'
    },
    "body": {
      type: String,
      optional: true,
      label: 'Body'
    },
    "groups": { /* which groups this template belongs to */
      type: [String],
      optional: true,
      allowedValues: EMAIL_TEMPLATE_GROUPS_VALUES,
      autoform: {
        options: _.map(EMAIL_TEMPLATE_GROUPS_OPTIONS, function(option) { return _.pick(option, 'value', 'label'); })
      }
    },
  }
]);

EmailTemplates.attachSchema(Schemas.EmailTemplates);
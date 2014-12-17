// return the class name(s) if predicate holds
Template.registerHelper('classIf', function(classes, predicate) {
  return predicate ? classes : "";
});
Template.registerHelper('classUnless', function(classes, predicate) {
  return !predicate ? classes : "";
});

// check if the two values are equal (weak comparison)
Template.registerHelper('equals', function(val1, val2) {
  return val1 == val2;
});

// check if the given value is in the array
Template.registerHelper('contains', function(array, value) {
  return _.contains(array, value);
});

// return the current environment (local|production)
Template.registerHelper('environment', function() {
  return Settings['environment'];
});  

Template.registerHelper('CurrentUserId', function() {
  return Meteor.userId();
});

// template helper to use the value of a Session variable directly in the template
Template.registerHelper('Session', function(key) {
  return Session.get(key);
});

// template helper for testing if a Session variable equals a specified value
Template.registerHelper('SessionEquals', function(key, val) {
  return Session.equals(key, val);
});

Template.registerHelper('Constant', function(key) {
  return window[key];
});

// template helper for stripping the protocol of an url
Template.registerHelper('ShowUrl', function(url) {
  return Url.show(url);
});

// template helper to transform Date() object to readable tring
Template.registerHelper('Calendar', function(date) {
  if (!date) return "";
  return Util.calendar(date);
});

// template helper to transform Date() object to readable tring
Template.registerHelper('Date', function(date, format) {
  return Util.dateFormat(date, format);
});

// template helper to convert number to valuta string 
Template.registerHelper('Currency', function(value) { 
  return Util.convertToCurrency(value);
});

Template.registerHelper('HTML', function(html) {
  return new Spacebar.SafeString(html);
});

Template.registerHelper('Domain', function(url) {
  url = _.isString(url) ? url : null;
  return Url.domain(url);
});

Template.registerHelper('Hostname', function(url) {
  url = _.isString(url) ? url : null;
  return Url.hostname(url);
});

Template.registerHelper('CityName', function(city) {
  return CITYMAP[city].name;
});

Template.registerHelper('CurrentCity', function() {
  var city = Session.get('currentCity');
  return CITYMAP[city];
});

Template.registerHelper('IsForeignCity', function(city) {
  return Util.isForeignCity(city);
});

Template.registerHelper('Plural', function(single, plural, count) {
  if (_.isNumber(plural)) {
    count = plural;
    plural = _.pluralize(single);
  }
  return count === 1 ? single : plural;
});
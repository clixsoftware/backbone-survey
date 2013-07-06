var BackboneSurvey = BackboneSurvey || {};

(function() {
  // Section
  var Section = BackboneSurvey.Section = Backbone.Model.extend({
    constructor: function() {
      Backbone.Model.apply(this, arguments);
    }

  , defaults: {
      page: 0
    , type: BackboneSurvey.QuestionType.NONE
    , question: ""
    , label: ""
    , guide: ""
    , options: [] // select options
    , textOptions: [] // option keys that need a free text answer
    , singleOptions: [] // option keys that disable the other keys
    , optionAnswers: [] // selected options
    , textAnswers: [] // free text answers
    , defaultOptionAnswers: []
    , defaultTextAnswers: []
    , rules: []
    , routeDependencies: []
    }

  , set: function(key, val, options) {
      if (key === null) return this;

      if (typeof key === 'object') {
        attrs = key;
        options = val;
      } else {
        (attrs = {})[key] = val;
      }

      // :id must be a string
      if (typeof(attrs.id) !== "undefined") {
        attrs.id = attrs.id.toString();
      }
      // :page must be a number
      if (typeof(attrs.page) !== "undefined") {
        attrs.page = _.isNumber(attrs.page) ? parseInt(attrs.page, 10) : 0;
      }

      // Convert :options string to object
      if (typeof(attrs.options) !== "undefined") {
        var opts = attrs.options || [];
        attrs.options = [];
        _.each(opts, function(v) {
          if (typeof(v) !== "object") {
            v = { value: v.toString(), label: v.toString() };
          }
          attrs.options.push(v);
        });
      }

      Backbone.Model.prototype.set.call(this, attrs, options);
    }

  , validate: function(attr, options) {
      var errors = [];
      var answers = this.answers(attr);
      var me = this;
      _.each(this.attributes.rules, function(rule) {
        if (errors.length > 0) return;
        var result = rule.validate(answers, me.attributes);
        if (!result.valid) errors.push(result.message);
      });
      if (errors.length > 0) return errors;
    }

  , answers: function(attr) {
      attr = attr || this.attributes;
      var vals = [];
      switch (this.get("type")) {
        case BackboneSurvey.QuestionType.TEXT:
          vals = attr.textAnswers;
          break;
        case BackboneSurvey.QuestionType.RADIO:
        case BackboneSurvey.QuestionType.CHECKBOX:
          vals = attr.optionAnswers;
          break;
        default:
          break;
      }
      return vals;
    }

  , clearAnswers: function() {
      this.set({
        optionAnswers: []
      , textAnswers: []
      }, { silent: true });
    }
  });

  // Sections
  var Sections = BackboneSurvey.Sections = Backbone.Collection.extend({
    model: Section

  , firstPage: function() {
      return this.reduce(function(memo, model) {
        var p = model.get("page");
        return (memo === 0 || memo > p) ? p : memo;
      }, 0);
    }

  , lastPage: function() {
      return this.reduce(function(memo, model) {
        var p = model.get("page");
        return (memo === 0 || memo < p) ? p : memo;
      }, 0);
    }

  , prevPage: function(currentPage) {
      var ps = [];
      this.each(function(model) {
        var p = model.get("page");
        if (p < currentPage) {
          ps.push(p);
        }
      });
      ps = _.sortBy(ps, function(n) { return -1 * n; });
      return (ps.length > 0) ? ps[0] :
          (currentPage === 0) ? this.firstPage() : currentPage;
    }

  , nextPage: function(currentPage) {
      var ps = [];
      this.each(function(model) {
        var p = model.get("page");
        if (p > currentPage) {
          ps.push(p);
        }
      });
      ps = _.sortBy(ps, function(n) { return n; });
      var last = this.lastPage();
      return (ps.length > 0) ? ps[0] :
          (currentPage === 0 || last < currentPage) ? last : currentPage;
    }
  });

  // Survey
  var Survey = BackboneSurvey.Survey = Backbone.Model.extend({
    constructor: function() {
      this.sections = new Sections();
      Backbone.Model.apply(this, arguments);
    }

  , defaults: {
      title: ""
    , page: 0
    }

  , parse: function(resp, options) {
      this.sections.reset(_.filter(resp.sections || [], function(s) {
          // Remove invalid id section
          return s.id.toString().match(/^[-_0-9a-zA-Z]+$/); }));
      return resp.survey;
    }

  , startPage: function() {
      this.sections.each(function(section) {
        section.clearAnswers();
        section.set({
          optionAnswers: section.get("defaultOptionAnswers")
        , textAnswers: section.get("defaultTextAnswers")
        });
      });
      var p = this.sections.firstPage();
      this.set({ page: p });
    }

  , prevPage: function() {
      var p = this.sections.prevPage(this.get("page"));
      if (p != this.get("page")) {
        this.set({ page: p });
      }
    }

  , nextPage: function() {
      var p = this.sections.nextPage(this.get("page"));
      if (p != this.get("page")) {
        this.set({ page: p });
      }
    }

  , isFirstPage: function() {
      return (this.get("page") === this.sections.firstPage());
    }

  , isLastPage: function() {
      return (this.get("page") === this.sections.lastPage());
    }

  , answers: function() {
      var ans = [];
      this.sections.each(function(section) {
        if (section.get("type") === BackboneSurvey.QuestionType.NONE) {
          return;
        }
        ans.push({
          id: section.id
        , textAnswers: section.get("textAnswers")
        , optionAnswers: section.get("optionAnswers")
        });
      });
      return ans;
    }
  });

  // Global Survey instance
  BackboneSurvey.survey = new Survey();
})();

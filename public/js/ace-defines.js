(function () {
  ace.define("ace/mode/mgsc_highlight_rules", function (require, exports, module) {
    const oop = require("ace/lib/oop");
    const TextHighlightRules = require("ace/mode/text_highlight_rules").TextHighlightRules;
    const MGSCHighlightRules = function () {
      const commonMMLRules = [
        {
          token: "mml.loop",
          regex: /(\[[0-9]?|\||\][0-9]?)/,
        },
        {
          token: "mml.jump",
          regex: "\\$",
        },
        {
          token: "mml.macro",
          regex: /\*[a-z]?[0-9]*/,
          caseInsensitive: true,
        },
        {
          token: "mml.rel-volume",
          regex: /[()][0-9]*/,
        },
        {
          token: "mml.command",
          regex: /([tqlv]|@[lmof])\s*[0-9]+/,
          caseInsensitive: true,
        },
        {
          token: "mml.command",
          regex: /(y)(s*[0-9]+)(\s*,\s*[0-9]+)/,
          caseInsensitive: true,
        },
        {
          token: "mml.ignore",
          regex: "!",
        },
        {
          token: "comment",
          regex: /;.*$/,
          next: "root",
        },
        {
          token: "eol",
          regex: /$/,
          next: "root",
        },
      ];

      function createCommonStates() {
        return {
          root: [
            {
              token: "comment",
              regex: /;.*$/,
            },
            {
              token: "directive",
              regex: /(^\s*)(#[a-z_]+)(\s*)/,
              caseInsensitive: true,
            },
            {
              token: "voice_def",
              regex: /^(\s*)(@[ersv]?[0-9]+)(\s*)(=)(\s*)/,
              caseInsensitive: true,
            },
            {
              token: "macro_def",
              regex: /^(\s*)(\*[a-z]?[0-9]*)(\s*)(=)(\s*)/,
              caseInsensitive: true,
            },
            {
              token: "paren.lparen",
              regex: "{",
              next: "block",
            },
          ],
          block: [
            {
              token: "comment",
              regex: /;.*$/,
            },
            {
              token: "paren.rparen",
              regex: "}",
              next: "root",
            },
            {
              defaultToken: "block_body",
            },
          ],
          mml: [
            ...commonMMLRules,
            {
              token: "mml.note",
              regex: /[a-gr](\+|\-)?(%?[0-9]+)?(\^%?[0-9]+)*/,
              caseInsensitive: true,
            },
            {
              token: "mml.voice",
              regex: /@[ers]?[0-9]+/,
              caseInsensitive: true,
            },
            {
              token: "mml.rel-octave",
              regex: /[<>]/,
            },
            {
              token: "mml.portament",
              regex: "_",
            },
            {
              token: "mml.command",
              regex: /(\\|@\\|@p)(\s*[+\-]\s*)?[0-9]+/,
              caseInsensitive: true,
            },
            {
              token: "mml.command",
              regex: /v(\s*[+\-]\s*)?[0-9]+/,
              caseInsensitive: true,
            },
            {
              token: "mml.command",
              regex: /[kmnops]\s*[0-9]+/,
              caseInsensitive: true,
            },
            {
              token: "mml.command",
              regex: /(h)(\s*(\+|\-)?\s*[0-9]+)(\s*,\s*(\+|\-)?\s*[0-9]+)*/,
              caseInsensitive: true,
            },
            {
              token: "mml.command",
              regex: /h[ofi]/,
            },
            {
              token: "mml.command",
              regex: /(so|sf)/,
            },
          ],
          rmml: [
            ...commonMMLRules,
            {
              token: "mml.note",
              regex: /[bshcm]+(:|%?[0-9]+)?(\^:|\^%?[0-9]+)*/,
              caseInsensitive: true,
            },
            {
              token: "mml.command",
              regex: /v[bshcm](\s*[+\-]\s*)?[0-9]+/,
              caseInsensitive: true,
            },
            {
              token: "mml.command",
              regex: /(ko|kf)/,
            },
            {
              token: "mml.command",
              regex: /(so|sf)/,
            },
          ],
        };
      }

      function addStatePrefix(states, prefix) {
        const res = {};
        for (const key in states) {
          const rules = states[key];
          const newRules = [];
          for (const rule of rules) {
            newRules.push({
              ...rule,
              next: rule.next != null ? `${prefix}$${rule.next}` : undefined,
            });
          }
          res[`${prefix}$${key}`] = newRules;
        }
        return res;
      }

      function createMode0States() {
        const states = createCommonStates();
        states.root.push({
          token: "channel",
          regex: /^s*[0-9a-hA-H]+\s/,
          next: "mml",
        });
        return addStatePrefix(states, "mode0");
      }

      function createMode1States() {
        const states = createCommonStates();
        states.root.push({
          token: "channel",
          regex: /^s*[fr]\s/,
          caseInsensitive: true,
          next: "rmml",
        });
        states.root.push({
          token: "channel",
          regex: /^s*[0-9a-fr]+\s/,
          caseInsensitive: true,
          next: "mml",
        });
        return addStatePrefix(states, "mode1");
      }

      this.$rules = {
        start: [
          {
            token: "comment",
            regex: /;.*$/,
          },
          {
            token: ["space", "directive", "space"],
            regex: /^(\s*)(#opll_mode)(\s+)/,
            caseInsensitive: true,
            next: "mode_param",
          },
          {
            defaultToken: "comment",
          },
        ],
        mode_param: [
          {
            token: "block",
            regex: "0",
            next: "mode0$root",
          },
          {
            token: "block",
            regex: "1",
            next: "mode1$root",
          },
        ],
        ...createMode0States(),
        ...createMode1States(),
      };
    };
    oop.inherits(MGSCHighlightRules, TextHighlightRules);
    exports.MGSCHighlightRules = MGSCHighlightRules;
  });

  ace.define("ace/mode/mgsc", function (require, exports, module) {
    const oop = require("ace/lib/oop");
    const TextMode = require("ace/mode/text").Mode;
    const MGSCHighlightRules = require("ace/mode/mgsc_highlight_rules").MGSCHighlightRules;
    // let MatchingBraceOutdent = require("ace/mode/matching_brace_outdent").MatchingBraceOutdent;
    const Mode = function () {
      this.HighlightRules = MGSCHighlightRules;
      // this.$outdent = new MatchingBraceOutdent();
    };
    oop.inherits(Mode, TextMode);
    (function () {
      // Extra logic goes here.
    }).call(Mode.prototype);
    exports.Mode = Mode;
  });

  ace.define("ace/theme/mgsc", function (require, exports, module) {
    exports.isDark = false;
    exports.cssClass = "ace_mgsc";
    exports.cssText = `
  .ace_editor.ace_mgsc {
    color: rgba(0,0,0,0.87);
    background-color: #f0f0f0;
  }
  .ace_mgsc .ace_marker-layer .ace_bracket {
    margin: -1px 0 0 -1px;
    background-color: #bfbfbf;
  }
  .ace_mgsc .ace_marker-layer .ace_active-line {
    background-color: rgba(0,0,0,0.071);
  }
  .ace_mgsc .ace_gutter-active-line {
    background-color: rgba(0,0,0,0.071);
  }
  .ace_mgsc .ace_comment {
    color: #888;
  }
  .ace_mgsc .ace_directive {
    color: #606;
  }
  .ace_mgsc .ace_voice_def {
    color: #606;
  }
  .ace_mgsc .ace_block_body {
    color: #643;
  }
  .ace_mgsc .ace_macro_def {
    color: #606;
  }
  .ace_mgsc .ace_paren {
    color: #999;
  }
  .ace_mgsc .ace_channel {
    color: #06c;
  }
  .ace_mgsc .ace_mml.ace_loop {
    color: #08c;
  }
  .ace_mgsc .ace_mml.ace_rel-volume {
    color: #999;
  }
  .ace_mgsc .ace_mml.ace_rel-octave {
    color: #999;
  }
  .ace_mgsc .ace_mml.ace_macro {
    color: #606;
  }
  .ace_mgsc .ace_mml.ace_command {
    color: #084;
  }
  .ace_mgsc .ace_mml.ace_voice {
    color: #808;
  }
  .ace_mgsc .ace_mml.ace_jump {
    color: #d00;
  }
  .ace_mgsc .ace_mml.ace_ignore {
    color: #d00;
  }

  .ace_mgsc .ace_selection {
    background-color: #ACCEF7;
  }
  .ace_mgsc .ace_selected-word {
    background-color: #ddd;
  }
  .ace_mgsc .ace_gutter {
    background-color: #eee;
  }
  `;
    const dom = require("../lib/dom");
    dom.importCssString(exports.cssText, exports.cssClass);
  });

  ace.define("ace/theme/mgsc-dark", function (require, exports, module) {
    exports.isDark = true;
    exports.cssClass = "ace_mgsc_dark";
    exports.cssText = `
  .ace_editor.ace_mgsc_dark {
    color: #f0f0f0;
    background-color: #222222;
  }
  .ace_mgsc_dark .ace_marker-layer .ace_bracket {
    margin: -1px 0 0 -1px;
    background-color: #bfbfbf;
  }
  .ace_mgsc_dark .ace_marker-layer .ace_active-line {
    background-color: rgba(255,255,255,0.14);
  }
  .ace_mgsc_dark .ace_gutter-active-line {
    background-color: rgba(255,255,255,0.14);
  }
  .ace_mgsc_dark .ace_comment {
    color: #aaa;
  }
  .ace_mgsc_dark .ace_directive {
    color: #ee0;
  }

  .ace_mgsc_dark .ace_voice_def {
    color: #fbf;
  }
  .ace_mgsc_dark .ace_block_body {
    color: #ec8;
  }
  .ace_mgsc_dark .ace_macro_def {
    color: #e8e;
  }
  .ace_mgsc_dark .ace_paren.ace_lparen {
    color: #aaa;
  }
  .ace_mgsc_dark .ace_paren.ace_rparen {
    color: #aaa;
  }
  .ace_mgsc_dark .ace_channel {
    color: #4ef;
  }
  .ace_mgsc_dark .ace_mml.ace_loop {
    color: #4ce;
  }
  .ace_mgsc_dark .ace_mml.ace_rel-volume {
    color: #999;
  }
  .ace_mgsc_dark .ace_mml.ace_rel-octave {
    color: #999;
  }
  .ace_mgsc_dark .ace_mml.ace_macro {
    color: #e8e;
  }
  .ace_mgsc_dark .ace_mml.ace_command {
    color: #ae8;
  }
  .ace_mgsc_dark .ace_mml.ace_voice {
    color: #fbf;
  }
  .ace_mgsc_dark .ace_mml.ace_jump {
    color: #ff0;
  }
  .ace_mgsc_dark .ace_mml.ace_ignore {
    color: #ff0;
  }
  .ace_mgsc_dark .ace_selection {
    background-color: rgba(88,172,247,0.5);
  }
  .ace_mgsc_dark .ace_selected-word {
    background-color: #666;
  }
  .ace_mgsc_dark .ace_gutter {
    background-color: #444;
  }
  `;
    const dom = require("../lib/dom");
    dom.importCssString(exports.cssText, exports.cssClass);
  });
})();

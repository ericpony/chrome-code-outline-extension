(function() {

  //if(!document.querySelector('.blob-wrapper')) return;
  var extensions = {
    Scala:      /\.scala$/,
    Bash:       /\.sh$/,
    JavaScript: /\.js$/
  };
  var lang;
  for(var _lang in extensions) {
    if(extensions[_lang].test(location.pathname)) {
      lang = _lang;
      break;
    }
  }
  if(!lang) return;

  var STYLE = {// CSS classes
    keyword:   'keyword',
    type:      'type',
    built_in:  'built-in',
    nominal:   'nominal',
    string:    'string',
    comment:   'comment',  // single line
    comments:  'comments', // block
    regexp:    'regex',
    character: 'char',
    hex_value: 'hex',
    numeric:   'value',
    macro:     'macro',
    symbol:    'symbol',
    constant:  'constant',
    reference: 'reference'
  };

  var LANG = {
    'Scala': { // incomplete
        regex: {
          type:      /\b[$_]*[A-Z][$\w]*\b/g,
          keyword:  'yield lazy override with false true sealed abstract private null if for while throw finally protected extends import final return else break new catch super class case package default try this match continue throws implicitly implicit _[\\d]+',
          literal:  { r: /\b'[a-zA-Z_$][\w$]*(?!['$\w])\b/g, css: STYLE.symbol, p: 0 }, // symbol literal
          comment:  { r: /\/\/.*$/gm,            css: STYLE.comment,   p:0 },
          comments: { r: /\/\*[\s\S]*?\*\//gm,   css: STYLE.comments,  p:0 },
          type_ctor: /\b(?:()([\w$]+)(?=\s*:)|()([$\w]+)(?=\s*<-))/g,
          ref_ctor: (function() {
            var regex = /(val|var|def|object|trait|class|type)\s+([$\w]+)/g;
            return {
              lastIndex: 0,
              parse: function(text, pos, begin_mark, end_mark, createScope) {
                var spaces = '';
                while(text[pos] == ' ') { spaces+=' '; pos++; }
                colorize(spaces);
                if(text[pos]==begin_mark) {
                  if(createScope) Scopes.create(false, true);
                  return parse_block(text, pos, begin_mark, end_mark);
                }else
                  return pos;
              },
              exec: function(text) {
                regex.lastIndex = this.lastIndex;
                var res = regex.exec(text);
                if(!res) return null;
                var fun = function() {
                  // handle signatures
                  var depth = 0, pos = this.parse(text, res.index + res[0].length, '[', ']');
                  while(true) {
                    var p = this.parse(text, pos, '(', ')', depth++ == 0);
                    if(p == pos)
                      break;
                    else
                      pos = p;
                  }
                  // a hack dealing with functions without braces, e.g.,
                  // def add(a: Int, b: Int): Int = a + b
                  var text2 = text.slice(pos);
                  var onelineFunc = /^[^(){};\n=]*[ \n]*(=?)[ \n]*([^ \n])/;
                  var res2 = onelineFunc.exec(text2);

                  if(res2 && res2[2]!='{') {
                    if(res[1]=='def') {
                      var pos2 = text2.indexOf("\n", res2[0].length-2);
                      parse(text2.substring(0, pos2));
                      this.lastIndex = Math.max(this.lastIndex, pos + pos2);
                      Scopes.destroy(false);
                    }else
                    if(/^(object|trait|class)$/.test(res[1])) {
                      Scopes.destroy(false);
                    }
                  }
                  this.lastIndex = Math.max(pos, this.lastIndex);
                }.bind(this);
                this.lastIndex = regex.lastIndex;
                var ret = ['', res[1], res[2], fun];
                ret.index = res.index;
                return ret;
              }
            };
          })()
        }
    },
    'JavaScript': { // incomplete
        regex: {
          //type:      'Object Function Boolean Error EvalError InternalError RangeError ReferenceError StopIteration SyntaxError TypeError URIError Number Math Date String RegExp Array Float32Array Float64Array Int16Array Int32Array Int8Array Uint16Array Uint32Array Uint8Array Uint8ClampedArray ArrayBuffer DataView JSON Intl',
          type:      /\b[$_]*[A-Z][$\w]*\b/g, // all literals with leading capital
          constant:  { r: /\b(?:true|false|null|undefined|NaN)\b/g, css: STYLE.symbol, p: 0 },
          keyword:   'new in if for while finally yield do return void else break catch instanceof with throw case default try this switch continue typeof delete yield export extends from as',
          built_in:  'eval isFinite isNaN parseFloat parseInt decodeURI decodeURIComponent encodeURI encodeURIComponent escape unescape arguments require',
          //ref_ctor:  /\b(?:(var|let|const|class|import)\s+([$\w]+)|(function\*?)\b\s*([$\w]*)\s*(\([^)]*\))|()([\w$]+)(?=:))/g,
          ref_ctor:  /\b(?:(var|let|const|class|import)\s+([$\w]+)|([$\w]+\*?)\b\s*([$\w]*)\s*(\([^)]*\)(?=\s*{))|()([\w$]+)(?=:))/g,
          comment:  { r: /\/\/.*$/gm,                    css: STYLE.comment,   p:0 },
          comments: { r: /\/\*[\s\S]*?\*\//gm,           css: STYLE.comments,  p:0 },
          reg_expr: { r: /\/(?:\\.|[^\/\n])+\/[a-z]*/g,  css: STYLE.regexp,    p:0 },
          self_ref: (function () {
            var regex = /\bthis\.([$\w]+)/g;
            return {
              css: STYLE.keyword,
              update: create_nominal,
              p: 1,
              r: {
                lastIndex: 0,
                exec: function(text) {
                  regex.lastIndex = this.lastIndex;
                  var res = regex.exec(text);
                  this.lastIndex = regex.lastIndex;
                  if(!res) return null;
                  var fun = function() {
                    colorize('this', STYLE.keyword);
                    colorize('.');
                    var scope = Scopes.current();
                    if(scope.parent && !scope.parent.is_function)
                      Scopes.nominal.update([undefined, res[1]], scope.parent);
                    else
                      colorize(res[1]);
                  };
                  var ret = ['', '', '', fun];
                  ret.index = res.index;
                  return ret;
                }
              }
            }
          })(),
        }, // end of regex
        paramlist_rule: /([$\w]+)([^,]*,?\W*)/g,
        paramlist_skip: /(for|while|switch)/,
        paramlist_parser: function(owner, paramlist) {
          if(this.paramlist_skip.test(owner))
            return parse(paramlist);
          var rr, r = this.paramlist_rule;
          while ((rr = r.exec(paramlist)) !== null) {
            create_nominal([undefined, rr[1]]);
            colorize(rr[2]);
            if(rr[2].indexOf(',') < 0) break;
          }
          this.paramlist_rule.lastIndex = 0;
        }
    },
    'Bash': {
      regex: {
        keyword : 'if then else elif fi for while in do done case esac local set until true false',
        built_in: 'break cd continue eval exec exit export getopts pwd return shift test alias trap bash',
        ref_ctor: /\b(?:()(\S+)(?==)|(function)\b\s*([$\w]*))/g,
        param1:  { r: /--\w\S+/g,     style: {color: '#393'},   p:0 },
        param2:  { r: /-\S+/g,        style: {color: '#099'},   p:0 },
        comment: { r: /#.*/g,         style: {color: 'gray'},   p:0 },
        posvar:  { r: /\$[\d?!#]+/g,  css: STYLE.nominal,       p:0 },
        varsign: { r: /\$(?=\w)/g,    css: STYLE.nominal,       p:0 },
      }
    },
    'Java': { // untested
        regex: {
          type:      'int float char boolean void long short double String null',
          keyword:   'false synchronized abstract private static if const for true while strictfp finally protected import native final enum else break transient catch instanceof byte super volatile case assert short package default public try this switch continue throws protected public private new return throw throws',
          type_ctor: /(?:\b(interface|class|extends|implements)\s+([$\w]+)|(\s+)([$\w]+)(?=\s+=\s+))/g,
          comment:  { r: /\/\/.*$/gm,            css: STYLE.comment,   p:0 },
          comments: { r: /\/\*[\s\S]*?\*\//gm,   css: STYLE.comments,  p:0 },
        }
    },
    'C++': { // untested
      regex: {
        type_ctor: '',
        type:      'char bool short int long float double unsigned clock_t size_t va_list __int32 __int64',
        keyword:   'break case catch class const const_cast continue default delete do dynamic_cast else enum explicit extern if for friend goto inline mutable namespace new operator private public protected register reinterpret_cast return sizeof static static_cast struct switch template this throw true false try typedef typeid typename union using virtual void volatile while',
        comment:  { r: /\/\/.*$/gm,            css: STYLE.comment,   p:0 },
        comments: { r: /\/\*[\s\S]*?\*\//gm,   css: STYLE.comments,  p:0 },
        macro:    { r: /^ *#.*/gm,             css: STYLE.macro,     p:0 },
      }
    }
  };
  LANG['Cpp'] = LANG['C'] = LANG['C++'];

  var COMMON = [
    { r: /"(?:\\.|[^"])*"/g,     css: STYLE.string,    p:0 },
    { r: /'(?:\\.|[^'])*'/g,     css: STYLE.character, p:0 },
    { r: /0[xX][\da-fA-F]+/g,    css: STYLE.hex_value, p:0 },
    { r: /\b\d*\.?\d+[eE]?\d*/g, css: STYLE.numeric,   p:0 },
    { r: /[{}]/g,                css: '',              p:0 }
  ];

  var cache;
  var debug_mode;

  function extend(origin, more) {
    if(!origin || !more) return origin;
    for(var name in more) {
      if(more.hasOwnProperty(name)) {
        if(name[0]=='_' && !!origin.dataset)
          origin.dataset[name.slice(1)] = more[name];
        else
          origin[name] = more[name];
      }
    }
    return origin;
  }
  function timer() {
    if(performance && performance.now) return performance.now();
    if(Date.now) return Date.now();
    return new Date().getTime()*1000;
  }
  Object.prototype.extendWith = function(more) { return extend(this, more) }

  function create_link(name) {
    return {
      _anchor      : name,
      onmouseover  : ref_hover_handler(true),
      onmouseleave : ref_hover_handler(false)
    };
  }

  function create_nominal(nominals) {
    var owner = nominals[0];
    var ident = nominals[1];
    if(ident) {
      var scope = Scopes.current();
      var name = scope.id + '-' + ident;
      var attr = create_link(name);
      //attr.className = cache.syntax.type_ctor.css + ' ' + name;
      attr.className = STYLE.nominal + ' ' + name;
      attr.name      = name;
      colorize(ident, undefined, undefined, attr);
      Scopes.add_nominal(ident);
    }
    for(var i=2; i<nominals.length; i++) {
      if(!nominals[i]) continue;
      if(nominals[i].constructor === Function.prototype.constructor) {
        nominals[i]();
        continue;
      }
      if(nominals[i][0]!='(' || nominals[i][nominals[i].length-1]!=')') {
        colorize(nominals[i]);
        continue;
      }
      var paramlist = nominals[i].slice(1, -1);
      colorize('(');
      Scopes.create(false, true);
      if(paramlist) { // is nonempty
        if(cache.paramlist_parser)
          cache.paramlist_parser(owner, paramlist);
        else
          parse(paramlist);
      }
      colorize(')');
    }
    return true;
  }

 var create_syntax = (function() {
    function regexp(pattern) {
      if(!pattern || typeof pattern != 'string') return pattern;
      return new RegExp('\\b(?:' + pattern.replace(/ /g, '|') + ')\\b', 'g');
    }
    return function(lang) {
      var syntax = LANG[lang].regex;
      if(!LANG[lang].processed) {
        if(syntax.keyword)   syntax.keyword   = { r: regexp(syntax.keyword),  css: STYLE.keyword,  p: 0 };
        if(syntax.type)      syntax.type      = { r: regexp(syntax.type),     css: STYLE.type,     p: 1 };
        if(syntax.built_in)  syntax.built_in  = { r: regexp(syntax.built_in), css: STYLE.built_in, p: 0 };
        if(syntax.type_ctor) syntax.type_ctor = { r: syntax.type_ctor,        css: STYLE.type,     p: 3, update: create_nominal };
        if(syntax.ref_ctor)  syntax.ref_ctor  = { r: syntax.ref_ctor,         css: STYLE.reference,p: 3, update: create_nominal };
        LANG[lang].processed = true;
      }
      return syntax;
    }
  })();

  var Scopes = (function() {
    var _stack = [];
    var _counter = 0;
    var _lang;
    function gen_id() { return 'p' + (++_counter) }
    return {
      id:      gen_id(),
      current: function() { return _stack[_stack.length-1] },
      reset:   function(lang) {
        _lang = lang;
        _stack = [];
        this.create(true, true);
      },
      destroy: function(is_enclosed) {
        if(is_enclosed)
          while(!_stack.pop().is_enclosed);
        else if(!this.current().is_enclosed)
          _stack.pop();
        else
          return;
        if(!this.current()) debugger;
        this.update_nominals();
      },
      create:  function(is_enclosed, is_function) {
        var scope = this.current();
        if(scope && !scope.is_enclosed) {
          if(is_enclosed) {
            scope.is_enclosed = true;
            scope.is_function = true;
            return;
          }
          this.destroy(false);
        }
        _stack.push({
          id: this.id + '-' + gen_id(),
          nominals: {},
          nominal_regex: '',
          is_enclosed: is_enclosed,
          is_function: is_function,
          parent: scope
        });
      },
      lookup:  function(name, scope) {
        if(name[0] == '.') return;
        if(!scope) scope = this.current();
        while(scope) {
          if(scope.nominals[name]) return scope;
          scope = scope.parent;
        }
      },
      add_nominal: function(name) {
        var scope = this.current();
        if(scope.nominals[name]) return;
        scope.nominal_regex = !scope.nominal_regex ? name : (scope.nominal_regex + '|' + name);
        scope.nominals[name] = true;
        this.update_nominals();
      },
      update_nominals: function() {
        var regexes = '';
        for(var i=0; i<_stack.length; i++)
          if(_stack[i].nominal_regex)
            regexes += '|' + _stack[i].nominal_regex;
        if(!regexes.length) return;
        var r = new RegExp('\\b\\.?(?:' + regexes.slice(1) + ')\\b', 'g');
        r.index     = Scopes.nominal.r.index;
        r.lastIndex = Scopes.nominal.r.lastIndex;
        Scopes.nominal.r = r;
      },
      state: function() { return _stack }
    };
  })();

  function colorize(str, css, style, attr) {
    if(!str) return;
    //var lines = escape(str).split('\n');
    var lines = str.replace(/ /g,'\u00a0').split('\n');
    for(var i = 0; i < lines.length; i++) {
      if(!cache.line) {
        var index = colorize.index || 1;
        var line = document.createElement('SPAN');
        var codeArea = document.getElementById('LC' + index);
        if(!codeArea) return;
        codeArea.innerHTML = '';
        codeArea.appendChild(line);
        line.className = 'code';
        cache.codeArea = codeArea;
        cache.line = line;
        colorize.index = index + 1;
      }
      if(lines[i] != '') {
        if(!css && !style && !attr) {
          cache.line.appendChild(document.createTextNode(lines[i]));
        }else {
          var span = document.createElement('SPAN');
          if(css) span.className = css;
          if(style) span.style.extendWith(style);
          if(attr) {
            if(attr.name) {
              var anchor = document.createElement('A');
              anchor.name = attr.name;
              anchor.style.cursor = 'default';
              anchor.style.textDecoration = 'none';
              anchor.appendChild(span);
              span = anchor;
            }
            span.extendWith(attr);
          }
          span.textContent = lines[i];
          cache.line.appendChild(span);
        }
        if(debug_mode) console.log(cache.line.innerText);
      }
      if(i+1 < lines.length) {
        cache.codeArea.appendChild(cache.line);
        cache.line = null;
      }
    } // end of for
  }

  function parse(text) {
    if(!text) return '';

    var last_index = 0, attr;
    var lexers = cache.lexers;
    var matches = lexers.map(function() { return 0 });
    var states = lexers.map(function(lexer) { return lexer.r.lastIndex });
    var tokens = [];

    while(true) {
      var ii  = -1;
      var pos = text.length;
      for(var i = 0; i < lexers.length; i++) {
        if(matches[i] == null) continue;
        if(!lexers[i].r) continue;
        if(!matches[i] || matches[i].index < last_index) {
          lexers[i].r.lastIndex = last_index;
          matches[i] = lexers[i].r.exec(text);
          if(matches[i] == null) continue;
          tokens[i] = [undefined, matches[i][0]];
          if(matches[i].length>=2) {
            for(var j=1, k=0; j<matches[i].length; j++) {
              while(matches[i][j]===undefined && ++j<matches[i].length);
              tokens[i][k++] = matches[i][j];
            }
          }
        }
        if(matches[i].index<pos || (matches[i].index==pos && lexers[ii].p<lexers[i].p)) {
          pos = matches[i].index;
          ii = i;
        }
      }// end of for

      if(ii == -1) { colorize(text.slice(last_index)); break; } // no highlight needed anymore

      colorize(text.slice(last_index, pos));  // generate plaintext for text[last_index...pos-1]

      if(!tokens[ii][0]) {
        if(tokens[ii][1] == '{') Scopes.create(true);
        else
        if(tokens[ii][1] == '}') Scopes.destroy(true);
      }else {
        colorize(tokens[ii][0], STYLE.keyword);
        colorize(' ');
      }
      if(lexers[ii].update) {
        if(lexers[ii].update(tokens[ii]))
          matches[matches.length-1] = 0;  // reset searched test for nominal rule
      }else {
        colorize(tokens[ii][1], lexers[ii].css, lexers[ii].style);
      }
      if(last_index == lexers[ii].r.lastIndex) { throw new Error('highlight.js detects an infinite loop!'); }
      last_index = lexers[ii].r.lastIndex;
      attr = undefined;
    }// end of while
    states.forEach(function(s,i) { lexers[i].r.lastIndex = s });
  }

  function parse_block(text, begin_pos, begin_mark, end_mark) {
    var end_pos = find_rightmost_paren_pos(text, begin_pos, begin_mark, end_mark);
    if(end_pos>=text.length) throw new Error('Invalid code: unmatched parentheses "' + begin_mark + '"');
    if(end_pos>begin_pos) {
      colorize(begin_mark);
      parse(text.substring(begin_pos + 1, end_pos))
      colorize(end_mark);
    }
    return end_pos + 1;
  }

  function find_rightmost_paren_pos(str, begin_pos, begin_mark, end_mark) {
    if(str[begin_pos] != begin_mark) return str;
    var c = 1, ptr = begin_pos + 1;
    while(c>0 && ptr<str.length) {
      switch(str[ptr]) {
        case begin_mark: c++; break;
        case end_mark:   c--; break;
      }
      ptr++;
    }
    return ptr - 1;
  }

  function create_highlighted_code(code, attr, options) {

    var div = document.querySelector('.blob-wrapper');
    if(!div) return;

    var startTime = timer();
    options = options || {};
    cache = extend({}, attr);
    cache.codeArea = options['lineno'] ? document.createElement('OL') : document.createElement('UL');

    if(!options['dont-reset'] || Scopes.nominal.r === undefined) {
      Scopes.nominal.r = '';
      Scopes.reset();
    }
    //var text = element.textContent
               //.replace(/&lt;/g,   '<')
               //.replace(/&gt;/g,   '>')
               //.replace(/&quot;/g, '"')
               //.replace(/&nbsp;/g, ' ')
               //.replace(/&amp;/g,  '&');
               //console.log(text);
    parse(code);

    if(cache.line && cache.line.innerHTML)
      cache.codeArea.appendChild(cache.line);

    div.className = 'sh';
    div.elapsedTime = timer() - startTime;
  }

  var ref_click_handler = function(e) {

    var name = e.target.dataset.anchor || e.target.parentNode.dataset.anchor;
    if(!name) return;

    var node = document.querySelector('[name=' + name + ']').parentNode.parentNode;
    node.style.transition = '';
    node.style.backgroundColor = '#FF0';
    setTimeout(function() {
      node.style.transition = 'background .5s ease-in-out';
      node.style.backgroundColor = '';
    }, 10);

    location.href = '#' + name;
  };

  var ref_hover_handler = (function() {
    function lighten(name, on) {
      var elems = document.querySelectorAll('.' + name);
      for(var i=0; i<elems.length; i++) {
        elems[i].style.fontWeight = on ? 'bolder' : '';
        elems[i].style.backgroundColor = on ? 'yellow' : '';
      }
    }
    return function(on) {
      return function(e) { lighten(e.target.dataset.anchor, on) }
    }
  })();

  Scopes.nominal = {
    css:    STYLE.reference,
    update: function(nominals, scope) {
      var ident = nominals[1];
      var scope = Scopes.lookup(ident, scope);
      //if(!scope) return create_nominal(nominals);
      if(!scope) { colorize(ident); return false; }
      var name = scope.id + '-' + ident;
      attr = create_link(name);
      attr.onclick = ref_click_handler;
      attr.className = Scopes.nominal.css + ' link ' + name;
      colorize(ident, undefined, undefined, attr);
      return false;
    },
    p: 2
  };

  function init() {
    var code = '';
    var lines = document.querySelectorAll('.blob-code');
    if(!lines.length || init.done) return;
    init.done = true;

    //////////////////////////////////////////////////

    LANG[lang].syntax = create_syntax(lang);
    LANG[lang].lexers = (function(SYNTAX) {
      var ret = [];
      for(var rule in COMMON)
        if(COMMON.hasOwnProperty(rule)) ret.push(COMMON[rule]);
      for(var rule in SYNTAX)
        if(SYNTAX.hasOwnProperty(rule)) ret.push(SYNTAX[rule]);
      ret[-1] = { p: -1 }; // just a hack
      ret.push(Scopes.nominal);
      return ret;
    })(LANG[lang].syntax);

    var code = '';
    for(var i=0; i<lines.length; i++) {
      var line = lines[i].innerText;
      code += line;
      if(line != "\n") code += "\n";
    }
    create_highlighted_code(code, LANG[lang], undefined);

    //////////////////////////////////////////////////

    $.noConflict()

    var Markers = (function() {
      var marker_width  = 20;
      var marker_height = 8;
      var marker_colors = ['#8822FF', '#8888FF', '#8888AA', '#888844'];
      var color_ptr = 0;
      var scaled_offset = function(top, left) {
        top  = Math.round(document.documentElement.clientHeight * top / document.body.clientHeight);
        left = Math.round(document.documentElement.clientWidth * left / document.body.clientWidth);
        return [top, left];
      };
      var marker_click_handler = function(e) {
        //jQuery('#L' + e.target.title.slice(5)).mousedown();
        window.scrollTo(0, e.target.attributes.alt.value - Math.round(document.documentElement.clientHeight/2) - 18);
      };
      var marker_left = function() {
        var viewer = jQuery('.sh');
        return Math.round(viewer.offset().left + viewer.outerWidth()) + 1;
      };
      jQuery(window).resize(function(e) { Markers.reset() });
      return {
        clear: function() {
          jQuery('.pos-marker').each(function(i, elem) { elem.parentNode.removeChild(elem) });
        },
        add: function(elem) {
          var box = elem.getBoundingClientRect();
          var t = 'Line ' + elem.id.slice(2);
          var x = Math.round(box.left + window.pageXOffset - document.documentElement.clientLeft);
          var y = Math.round(box.top + window.pageYOffset - document.documentElement.clientTop);
          var yy = scaled_offset(y, x)[0]; // ignore xx by now
          jQuery(document.body).append('<div class="pos-marker" title="' + t + '" alt="' + y + '" style="top:' + yy + 'px"></div>');
        },
        reset: function() {
          var left = marker_left() + 'px';
          jQuery('.pos-marker').each(function(i, elem) {
            var yy = scaled_offset(elem.attributes.alt.value)[0] + 'px';
            elem.style.top  = yy;
            elem.style.left = left;
          });
        },
        done: function() {
          var width  = marker_width  + 'px';
          var height = marker_height + 'px';
          var left   = marker_left() + 'px';
          jQuery('.pos-marker').each(function(i, elem) {
            elem.style.position = 'fixed';
            elem.style.cursor   = 'pointer';
            elem.style.left     = left;
            elem.style.width    = width;
            elem.style.height   = height;
            elem.style.backgroundColor = marker_colors[color_ptr = (color_ptr+1) % marker_colors.length];
            elem.onclick = marker_click_handler;
          });
        }
      };
    })();

    var show_selected = function(e) {
      var text = window.getSelection().toString().trim();
      if(!text) return;
      text = text.replace(/([{}()[\]\\.?*+^$|=!:~-])/g, '\\$1'); // escape
      var regex1 = /<\/?mark>/g;
      var regex2 = new RegExp('>([^<]*)(' + text + ')([^<]*)<', 'g');
      Markers.clear();
      jQuery('.sh .blob-code').each(function(i, elem) {
        var html = elem.innerHTML.replace(regex1, '').replace(regex2, '>$1<mark>$2</mark>$3<');
        if(/<mark>/.test(html)) {
          Markers.add(elem);
        }
        elem.innerHTML = html;
      });
      Markers.done();
      jQuery('.sh .link').each(function(i, elem) {
        elem.onclick      = ref_click_handler;
        elem.onmouseover  = ref_hover_handler(true);
        elem.onmouseleave = ref_hover_handler(false);
      });
    }
    jQuery(".sh").on('mouseup', show_selected);

    //////////////////////////////////////////////////
  }
  document.addEventListener('DOMContentLoaded', init, false);

  init(); // for invocation from context menu
})();

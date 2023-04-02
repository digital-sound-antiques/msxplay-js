var QueryParser = (function() {
  var parseKeyValueChain = function(str, d, do_unescape) {
    var map = {};
    if (str != undefined) {
      var pairs = str.split(d);
      for (var i = 0; i < pairs.length; i++) {
        var kv = pairs[i].split(/=/);
        if (kv[0] != undefined) {
          kv[0] = kv[0].replace(/^\s+|\s+$/g, "");
          if (kv[1] == undefined) {
            map[kv[0]] = null;
          } else {
            if (do_unescape) {
              map[kv[0]] = decodeURIComponent(kv[1].replace(/^\s+|\s+$/g, ""));
            } else {
              map[kv[0]] = kv[1].replace(/^\s+|\s+$/g, "");
            }
          }
        }
      }
    }
    return map;
  };

  return {
    parse: function() {
      var query = String(document.location).match(/^.*\?([^#]*).*$/);
      if (query != null && query.length == 2) {
        return parseKeyValueChain(query[1], /&/, true);
      } else {
        return {};
      }
    }
  };
})();

module.exports = Layer;

var p2re = require("path-to-regexp");

function Layer(path, middleware) {
  if (path[path.length-1] === '/') {
    this.path = path.slice(0, -1);
  } else {
    this.path = path;
  }
  this.handle = middleware;
}

Layer.prototype.match = function(url) {
  var names = [];
  var re = p2re(this.path, names, {end: false});
  var m = re.exec(decodeURIComponent(url));

  if (m) {
    var o = new Object();
    var params = new Object();
    for (var i=1; i<m.length; i++) {
      params[names[i-1].name] = m[i];
    }
    o.path = m[0];
    o.params = params;
    return o;
  }
};

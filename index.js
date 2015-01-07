module.exports = myexpress;

function myexpress() {
  var ret = function (request, response) {
    response.statusCode = 404;
    response.end();
  };
  return ret;
}

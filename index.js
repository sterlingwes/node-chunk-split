/*
 * options:
 * - stream (function returning the stream to write to)
 * - chunkSeparator (how to separate chunks)
 * - chunkJoiner (how to join the chunks)
 * 		- string or regex to split
 * - chunkSize (how many)
 * - pauseEvent (string, event name on stream)
 * - wrapper (array, strings to prepend / append to stream)
 */
module.exports = function(options) {

  var through = require('through')
  
  var size = 0
  var separator = options.chunkSeparator || /\n/
  var stream
  var leftovers = []
  
  function getStream(num) {
    if(stream && (size + num) < options.chunkSize) return stream
    return stream = options.stream()
  }
  
  function doWrite(currentStream, part) {
    currentStream.write(part)
    this.emit('data', part)
  }
  
  function handleChunk(parts) {
    if(leftovers.length) {
      parts.unshift.apply(parts, leftovers)
      leftovers = []
    }
    
    var currentStream = getStream(parts.length)
    
    for(var p = 0; p < parts.length; p++) {
      var part = parts[p];
      if(size)  part = (options.chunkJoiner || '') + part
      else      part = (options.wrapper ? options.wrapper[0] : '') + part
      doWrite.call(this, currentStream, part)
      size++
      if(size >= options.chunkSize) {
        leftovers = parts.slice(p+1)
        break;
      }
    }
    
    if(size >= options.chunkSize) {
      if(options.wrapper)
        doWrite.call(this, currentStream, options.wrapper[1] || '')
      this.pause()
      size = 0
      stream.on(options.pauseEvent || 'response', function() {
        this.resume()
      }.bind(this))
    }
  }
  
  function write(data) {
    var parts = data.toString().split(separator)
    handleChunk.call(this, parts)
  }
  
  function end() {
    while(leftovers.length) { handleChunk.call(this, []) }
    this.emit('end')
  }
  
  return through(
    write,
    end
  )
  
}
var chunky = require('..')
var fs = require('fs')
var request = require('request')
var nock = require('nock')
var assert = require('assert')

var requests = []

function setupRequestIntercept() {
  nock('http://localhost.test')
  .post('/stream/chunk')
  .reply(200, function(uri, requestBody) {
    setupRequestIntercept()
    // console.log('REQ: ', requestBody)
    requests.push(requestBody)
    return requestBody
  })
}

describe('node-chunk-split', function() {
  
  beforeEach(function() {
    this.requests = []
    nock.disableNetConnect()
    setupRequestIntercept()
  })
  
  it('should split the sample file', function(done) {
    
    var readStream = fs.createReadStream('./test/objects.txt')
    var chunkSplit = chunky({
      stream: function() {
        return request.post('http://localhost.test/stream/chunk')
      },
      chunkJoiner: ',',
      chunkSize: 2,
      wrapper: ['{"products":[', ']}']
    })
    
    readStream
      .pipe(chunkSplit)
      .on('end',function() {
        setTimeout(function() {
          assert.equal(requests.length, 3)
          done()
        }, 250)
      }.bind(this))
    
  })
  
  it('should split a larger file', function(done) {
    
    requests = []
    
    var readStream = fs.createReadStream('./test/products.txt')
    var chunkSplit = chunky({
      stream: function() {
        return request.post('http://localhost.test/stream/chunk')
      },
      chunkJoiner: ',',
      chunkSize: 2,
      wrapper: ['{"products":[', ']}']
    })
    
    readStream
      .pipe(chunkSplit)
      .on('end',function() {
        setTimeout(function() {
          assert.equal(requests.length, 4)
          var basis = 1;
          requests.forEach(function(req) {
            var json = JSON.parse(req)
            assert.equal(json.products[0].affiliateId,basis.toString())
            assert.equal(json.products[1].affiliateId,(basis+1).toString())
            basis += 2
          })
          done()
        }, 250)
      })
    
  })
  
})
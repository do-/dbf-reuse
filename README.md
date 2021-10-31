# dbf-reuse
Using old .dbf files as templates for new ones

# Disclaimer
This software development is in alpha stage. Feel free to use it at your own risk.

# Motivation
Starting this project, the author was developing a node.js based application and needed a library to implement data import/export with a legacy dBASE III+ format. Mostly for generating .dbf files looking just like old ones, but filled with actual data.

He scanned through the npm registry and have found some modules coping with .dbf (the most advanced of them being [dbffile](https://github.com/yortus/DBFFile)), but:
* they all required access to file system;
* none of then provided a streaming API.

So he decided to first create from scratch a minimalistic library:
* doing nothing but converting javaScript objects to .dbf records and vice versa
  * as Transformer streams, for easy piping
* using existing .dbf files as source for metadata.

# Usage

Here are some basic examples. More documentation is at https://github.com/do-/dbf-reuse/wiki.

## Reading

```js
const iconv = require ('iconv-lite') // or whatever iconv you use
const {DBFReader} = require ('dbf-reuse')

let reader = new DBFReader ({
//  decoder             : b => iconv.decode (b, 'some-antique-dos-encoding'),
//  deletedFieldName    : '_deleted',   // if you need deleted records
//  lowerCaseFieldNames : false         // 0ld $c00l
})

let src = // ... .dbf file body as binary Readable Stream
let dst = // ... object mode Writable Stream to store parsed content

src.pipe (reader).pipe (dst)

```

## Writing

Making an empty template (zero records .dbf) from an existing file:
```js
const fs = require ('fs')
const {DBFWriter} = require ('dbf-reuse')

let is = fs.createReadStream ('big_old_data.dbf')
let os = fs.createWriteStream ('empty_template.dbf')

await DBFWriter.copyHeader (is, os)
```
Filling it up with data:
```js
const fs = require ('fs')
const iconv = require ('iconv-lite') // just copy/pasted it
const {DBFWriter} = require ('dbf-reuse')

let template = fs.createReadStream ('empty_template.dbf')

let source = getRecordsAsReadableObjectStream ()
let count  = getRecordCountAsInt ()

let writer = await DBFWriter.from (tmpl, {
    count,                             // if not set, remains as copied from the template
//  date                : new Date (), // if not set, remains as copied from the template
//  encoder             : s => iconv.encode (s, 'some-antique-dos-encoding'),
//  lowerCaseFieldNames : false        // 0ld $c00l
})

let destination = getWritableStreamToStoreIt () 

source.pipe (writer).pipe (destination)
```

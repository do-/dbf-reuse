# dbf-reuse
Using old .dbf files as templates for new ones

# Motivation
Starting this project, the author was developing a node.js based application and needed a library to implement data import/export with a legacy dBASE III+ format. Mostly for generating .dbf files looking just like old ones, but filled with actual data.

He scanned through the npm registry and have found some modules coping with .dbf (the most advanced of them being [dbffile](https://github.com/yortus/DBFFile)), but:
* they all required access to file system;
* none of then provided a streaming API.

So he decided to first create from scratch a minimalistic library:
* doing nothing but converting javaScript objects to .dbf records and vice versa
  * as Transformer streams, for easy piping
* using existing .dbf files as source for metadata.

# Installation

```shell
npm install dbf-reuse
```

# Usage

Here are some basic examples. More documentation is available at https://github.com/do-/dbf-reuse/wiki.

## Reading

```js
const {DBFReader} = require ('dbf-reuse')

let reader = new DBFReader ({
//  encoding            : 'some-antique-dos-encoding'
//  decoder             : b => b,       // why not reading C as raw Buffers?
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
const fs          = require ('fs')
const zlib        = require ('zlib')
const {DBFWriter} = require ('dbf-reuse')

let template = fs.createReadStream ('empty_template.dbf')

let source = getRecordsAsReadableObjectStream ()
let count  = getRecordCountAsInt ()

let writer = await DBFWriter.from (tmpl, {
//  encoding            : 'some-antique-dos-encoding',
    count,                             // if not set, remains as copied from the template
//  date                : new Date (), // if not set, remains as copied from the template
//  encoder             : b => b,      // if you supply properly encoded Buffers, not strings, for `C`
//  lowerCaseFieldNames : false        // 0ld $c00l
})

somehowReportNewFileMetadata ({
  name: 'DATA.DBF',
  size: writer.getFileSize (),         // calculates UNcompressed size
  //... MIME type and so on
})

let destination = getWritableStreamToStoreIt () 

source
  .pipe (writer)
  .pipe (zlib.createGzip ())           // think Content-Encoding: gzip
  .pipe (destination)
```

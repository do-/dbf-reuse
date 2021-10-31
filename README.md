# dbf-reuse
Using old .dbf files as templates for new ones

# Disclaimer
This software development is in alpha stage. Feel free to use it at your own risk.

# Motivation
Starting this project, the author was developing a node.js based application and needed a library to implement data import/export with a legacy dBASE III+ format. Mostly for generating .dbf files looking just like old ones, but filled with actual data.

He scanned through the npm registry and have found some modules coping with .dbf, but:
* they all required access to file system;
* none of then provided streaming API;
* each library was suitable either for reading or writing .dbf, not both;
* unnecessary dependencies were omnipresent.

So he decided to first create from scratch a minimalistic library:
* doing nothing but converting javaScript objects to .dbf records and vice versa
  * with node.js streams API
* using existing .dbf files as source for metadata.

# Usage

Here, there are some basic examples. More documentation is at https://github.com/do-/dbf-reuse/wiki.

## Reading

```
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

```
const iconv = require ('iconv-lite') // just copy/pasted it
const {DBFWriter} = require ('dbf-reuse')

let xmp = // ... sample .dbf file body as binary Readable Stream

let writer = await DBFWriter.from (xmp, {
//  count               : ...,         // if not set, remains copied from the template
//  date                : new Date (), // if not set, remains copied from the template
//  encoder             : s => iconv.encode (s, 'some-antique-dos-encoding'),
//  lowerCaseFieldNames : false        // 0ld $c00l
})

let src = // ... object mode Readable Stream with data records to be written out
let dst = // ...  Writable Stream to save the .dbf file body

src.pipe (writer).pipe (dst)
```

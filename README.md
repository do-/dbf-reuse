# dbf-reuse
Using old .dbf files as templates for new ones

# Disclaimer
This software development is in alpha stage. Feel free to use it at your own risk.

# Motivation
Starting this project, the author was developing a node.js based application and needed a library to implement data import/export operations in legacy dBASE III+ format. Mostly for generating .dbf files looking just like old ones, but filled with actual data.

He scanned through the npm registry and have found some modules coping with .dbf, but:
* they all required access to file system;
* none of then provided streaming API;
* each library was suitable either for reading or writing .dbf, not both;
* unnecessary dependencies were omnipresent.

So he decided to do his job first creating from scratch a minimalistic library 
* implementing nothing but conversion between javaScript objects and .dbf records in terms of node .js stream transformers
* and using existing .dbf files as source for metadata.

# Usage

Here, there are some basic examples. More documentation is at https://github.com/do-/dbf-reuse/wiki.

## Reading

```
const iconv = require ('iconv-lite') // or whatever iconv you use
const {DBFReader} = require ('dbf-reuse')

let reader = new DBFReader ({
//  decoder: b => iconv.decode (b, 'some-antique-dos-encoding'),
//  deletedFieldName: '_deleted', // if you need deleted records
//  lowerCaseFieldNames: false    // 0ld $c00l
})

let src = // ... .dbf file body as binary Readable Stream
let dst = // ... object mode Writable Stream to store parsed content

src.pipe (reader).pipe (dst)

```

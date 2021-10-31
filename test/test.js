const assert = require ('assert')
const fs = require ('fs')
const { Readable, Writable } = require ('stream')
const {DBFHeader, DBFReader, DBFWriter} = require ('../')
const crypto = require ('crypto')

const SRC_FILE_NAME = 'test/plat2.dbf'
const DST_FILE_NAME = 'test/generated.dbf'

function getInputStream () {
	return fs.createReadStream (SRC_FILE_NAME)
}

function getOutputStream () {
	return fs.createWriteStream (DST_FILE_NAME)
}

async function checksum (fn) {

	let h = crypto.createHash ('sha1')
	let s = fs.createReadStream (fn)
	
	return new Promise ((ok, fail) => {
		s.on ('error', fail)
		s.on ('end', () => ok (h.digest ('hex')))
		s.on ('data', b => h.update (b))
	})

}

function test_001_header_check_date (h) {
	const [old_date, new_date] = ['2015-08-27', '2016-09-28']
	assert.strictEqual (h.getDate (), old_date)	
	h.setDate (new_date)
	assert.strictEqual (h.getDate (), new_date)
}

function test_001_header_check_count (h) {
	const [old_count, new_count] = [1, 1000]
	assert.strictEqual (h.getCount (), old_count)	
	h.setCount (new_count)
	assert.strictEqual (h.getCount (), new_count)	
}

async function test_001_header () {

	let h = await DBFHeader.from (getInputStream ())
	
	assert.strictEqual (h.fields.length, 38)

	test_001_header_check_date  (h)
	test_001_header_check_count (h)

}

async function getRecords () {

	let reader = new DBFReader ({
		deletedFieldName: '_deleted',
		nulls: true,
	})

	return new Promise ((ok, fail) => {

		let records = [], is = getInputStream (), collector = new Writable  ({
			objectMode: true,
			write (r, _, cb) {cb (null, records.push (r))}
		})
		
		collector.on ('finish', () => ok (records))
				
		for (let s of [is, reader, collector]) s.on ('error', fail)
				
		is.pipe (reader).pipe (collector)

	})

}

async function test_002_read () {

	let records = await getRecords ()

	assert.strictEqual (records.length, 1)	
	assert.strictEqual (records [0].name_strit, 'Дудикекера')
	assert.strictEqual (records [0].d_fine, null)

}

async function test_003_write () {

	let records = await getRecords ()

	let writer = await DBFWriter.from (getInputStream (), {})

	Readable.from (records).pipe (writer).pipe (getOutputStream ())	
	
	let [checksum_src, checksum_dst] = await Promise.all ([SRC_FILE_NAME, DST_FILE_NAME].map (checksum))
	
	assert.strictEqual (checksum_src, checksum_dst)

}

async function main () {

	await test_001_header ()
	await test_002_read ()
	await test_003_write ()

}

main ()

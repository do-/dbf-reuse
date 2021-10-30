const assert = require ('assert')
const fs = require ('fs')
const { Writable } = require ('stream')
const {DBFReader, DBFHeader} = require ('../')
const iconv = require ('iconv-lite')

function getInputStream () {
	return fs.createReadStream ('test/plat2.dbf')
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

async function test_002_read () {

	let reader = new DBFReader ({
		decoder: b => iconv.decode (b, 'win1251'),
		deletedFieldName: '_deleted',
	})

	let records = await new Promise ((ok, fail) => {

		let records = [], is = getInputStream (), collector = new Writable  ({
			objectMode: true,
			write (r, _, cb) {cb (null, records.push (r))}
		})
		
		collector.on ('finish', () => ok (records))
				
		for (let s of [is, reader, collector]) s.on ('error', fail)
				
		is.pipe (reader).pipe (collector)

	})
	
	assert.strictEqual (records.length, 1, 'Body: # of records')
	
	assert.strictEqual (records [0].name_strit, 'Дудикекера')
	assert.strictEqual (records [0].d_fine, null)

}

async function main () {

	await test_001_header ()
	await test_002_read ()

}

main ()

const assert = require ('assert')
const fs = require ('fs')
const { Readable, Writable } = require ('stream')
const {DBFHeader, DBFReader, DBFWriter} = require ('../')
const crypto = require ('crypto')

const SRC_FILE_NAME = 'test/plat2.dbf'
const DST_FILE_NAME = 'test/generated.dbf'

const RECORD = {
  code_firme: '11111',
  rc: '5555555.555',
  mfo: '555555',
  mfo_ot: '555555',
  code_plat: '55',
  number: '1',
  c_fil: '5555',
  c_com: '5',
  n_sf: '0',
  nop: '55',
  abcount: '5555/55',
  pdate: '2015-08-26',
  ptime: '15:51:38',
  date_ob: '2015-08-26',
  n_plat: '555555',
  dateb: '2015-06-01',
  datee: '2015-08-31',
  summ: '55.00',
  summccy: 'UAH',
  orsumm: '55.00',
  orsummccy: 'RUB',
  summ_p: '0.00',
  countb: '0',
  counte: '0',
  countd: '0',
  fio: 'Иванов Е',
  code_c: '55',
  code_s: '55',
  name_strit: 'Дудикекера',
  n_house: '5',
  f_house: '0',
  a_house: null,
  d_house: '0',
  n_room: '55',
  a_room: null,
  code_erc: null,
  n_fine: null,
  d_fine: null
}

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
	assert.deepStrictEqual (records [0], RECORD)

}

async function test_003_write (patch) {

	let r = {...RECORD}; if (patch) patch (r)

	let arr = [r], src = Readable.from (arr)

	let dbf = await DBFWriter.from (getInputStream (), {count: arr.length})
	
	let size_plan = dbf.getFileSize ()
		
	let dst = getOutputStream ()
	
	await new Promise ((ok, fail) => {
	
		for (let i of [src, dbf, dst]) i.on ('error', fail)
		
		dst.on ('close', ok)

		src.pipe (dbf).pipe (dst)	

	})
	
	let size_fact = fs.statSync (DST_FILE_NAME).size

	assert.strictEqual (size_plan, size_fact)

	let [checksum_src, checksum_dst] = await Promise.all ([SRC_FILE_NAME, DST_FILE_NAME].map (checksum))
	
	assert.strictEqual (checksum_src, checksum_dst)

}

async function main () {

	await test_001_header ()
	await test_002_read ()
	await test_003_write ()
	await test_003_write (r => r.code_firme = parseInt (r.code_firme))
	await test_003_write (r => r.summ = parseFloat (r.summ))
	await test_003_write (r => r.rc = parseFloat (r.rc))
	await test_003_write (r => r.orsumm = parseInt (r.orsumm))
	await test_003_write (r => r.pdate = new Date (r.pdate))
	await test_003_write (r => r.pdate = Date.parse (r.pdate))

}

main ()

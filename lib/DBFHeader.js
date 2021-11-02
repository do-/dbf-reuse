const iconv = require ('iconv-lite')
const {DBFField}  = require ('./DBFField')
const {DBFReader} = require ('./DBFReader')

////////////////////////////////////////////////////////////////////////////////

const code_page = {
	0x01: 437,       // U.S. MS-DOS
	0x02: 850,       // International MS-DOS
	0x03: 1252,      // Windows ANSI
	0x08: 865,       // Danish OEM
	0x09: 437,       // Dutch OEM
	0x0a: 850,       // Dutch OEM*
	0x0b: 437,       // Finnish OEM
	0x0d: 437,       // French OEM
	0x0e: 850,       // French OEM*
	0x0f: 437,       // German OEM
	0x10: 850,       // German OEM*
	0x11: 437,       // Italian OEM
	0x12: 850,       // Italian OEM*
	0x13: 932,       // Japanese Shift-JIS
	0x14: 850,       // Spanish OEM*
	0x15: 437,       // Swedish OEM
	0x16: 850,       // Swedish OEM*
	0x17: 865,       // Norwegian OEM
	0x18: 437,       // Spanish OEM
	0x19: 437,       // English OEM (Britain)
	0x1a: 850,       // English OEM (Britain)*
	0x1b: 437,       // English OEM (U.S.)
	0x1c: 863,       // French OEM (Canada)
	0x1d: 850,       // French OEM*
	0x1f: 852,       // Czech OEM
	0x22: 852,       // Hungarian OEM
	0x23: 852,       // Polish OEM
	0x24: 860,       // Portuguese OEM
	0x25: 850,       // Portuguese OEM*
	0x26: 866,       // Russian OEM
	0x37: 850,       // English OEM (U.S.)*
	0x40: 852,       // Romanian OEM
	0x4d: 936,       // Chinese GBK (PRC)
	0x4e: 949,       // Korean (ANSI/OEM)
	0x4f: 950,       // Chinese Big5 (Taiwan)
	0x50: 874,       // Thai (ANSI/OEM)
	0x57: 1252,      // ANSI
	0x58: 1252,      // Western European ANSI
	0x59: 1252,      // Spanish ANSI
	0x64: 852,       // Eastern European MS-DOS
	0x65: 866,       // Russian MS-DOS
	0x66: 865,       // Nordic MS-DOS
	0x67: 861,       // Icelandic MS-DOS
	0x6a: 737,       // Greek MS-DOS (437G)
	0x6b: 857,       // Turkish MS-DOS
	0x6c: 863,       // French-Canadian MS-DOS
	0x78: 950,       // Taiwan Big 5
	0x79: 949,       // Hangul (Wansung)
	0x7a: 936,       // PRC GBK
	0x7b: 932,       // Japanese Shift-JIS
	0x7c: 874,       // Thai Windows/MS-DOS
	0x86: 737,       // Greek OEM
	0x87: 852,       // Slovenian OEM
	0x88: 857,       // Turkish OEM
	0xc8: 1250,      // Eastern European Windows
	0xc9: 1251,      // Russian Windows
	0xca: 1254,      // Turkish Windows
	0xcb: 1253,      // Greek Windows
	0xcc: 1257,      // Baltic Windows
}

////////////////////////////////////////////////////////////////////////////////

const DBFHeader = class {

	constructor (options) {
	
		this.fields = []
		
		let {lowerCaseFieldNames} = options; if (lowerCaseFieldNames !== false) this.lowerCaseFieldNames = true

		for (let k of ['encoding', 'encoder', 'decoder']) if (k in options) this [k] = options [k]
		
	}
	
	cut_header (data) {
	
		let len = data.readInt16LE (8)
		
		this.src = data.slice (0, len)
		
		this.parse ()
		
		return data.slice (len)
	
	}
	
	getDate () {
	
		let {src} = this, s = '' + (src.readUInt8 (1) + this._epoch)
		
		for (let i = 2; i <= 3; i ++) s += '-' + ('' + src.readUInt8 (i)).padStart (2, '0')

		return s
	
	}

	setDate (v) {
	
		let d = v instanceof Date ? v : new Date (v); if (!d) throw new Error (`Invalid date value: ${v}`)

		Buffer.from ([
			d.getFullYear () - this._epoch,
			d.getMonth () + 1,
			d.getDate (),
		]).copy (this.src, 1)

	}
	
	getCount () {
		return this.src.readInt32LE (4)
	}

	setCount (v) {
		return this.src.writeInt32LE (v, 4)
	}
	
	getFileSize () {
	
		let {_step, src: {length}} = this
		
		return 1 + length + this.getCount () * _step
	
	}

	parse () {
	
		let {src, lowerCaseFieldNames} = this
		
		this.ver    = src.readUInt8 (0)
		this._epoch = src.readUInt8 (1) < 83 ? 2000 : 1900
		this._step  = src.readInt16LE (10)
		this._lang  = src.readUInt8 (29)

		if (!this.encoding && this._lang in code_page) this.encoding = 'cp' + code_page [this._lang]
		
		let {encoding, encoder, decoder} = this; if (encoding) {
		
			if (!encoder) encoder = _ => iconv.encode (_, encoding)
			
			if (!decoder) decoder = _ => iconv.decode (_, encoding)
		
		}
								
		let from = 1; for (let pos = 32 ; pos < src.length - 1; pos += 32) {

			let field = new DBFField ({from, encoder, decoder, src: src.slice (pos, pos + 31)})

			if (lowerCaseFieldNames) field.name = field.name.toLowerCase ()
		
			this.fields.push (field)
			
			from = field._pos.to
		
		}

	}

}

DBFHeader.from = async function (is, options = {}) {
	
	let {encoding, encoder, lowerCaseFieldNames} = options; if (lowerCaseFieldNames !== false) lowerCaseFieldNames = true

	let tf = new DBFReader ({no_data: true, encoding, encoder, lowerCaseFieldNames})
	
	return new Promise ((ok, fail) => {

		is.on ('error', fail)
		tf.on ('error', fail)

		is.on ('close', () => ok (tf.header))
		tf.on ('close', () => is.destroy ())

		is.pipe (tf)

	})

}

module.exports = {DBFHeader}
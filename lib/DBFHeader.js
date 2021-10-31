const iconv = require ('iconv-lite')
const {DBFField}  = require ('./DBFField')
const {DBFReader} = require ('./DBFReader')

////////////////////////////////////////////////////////////////////////////////

const DBFHeader = class {

	constructor (options) {
	
		this.fields = []
		
		let {lowerCaseFieldNames, encoding} = options; if (lowerCaseFieldNames !== false) this.lowerCaseFieldNames = true
		
		if (encoding) {
			options.encoder = _ => iconv.encode (_, encoding)
			options.decoder = _ => iconv.decode (_, encoding)
		}

		for (let k of ['encoder', 'decoder']) if (k in options) this [k] = options [k]

		this._epoch = 1900
		
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
	
		if (v instanceof Date) v = 
			v.getFullYear () 
			+ '-' + ('' + (1 + v.getMonth ())).padStart (2, '0')
			+ '-' + ('' + (v.getDate ())).padStart (2, '0')
	
		Buffer.from ([
			parseInt (v.slice (0,  4), 10) - this._epoch,
			parseInt (v.slice (5,  7), 10),
			parseInt (v.slice (8, 10), 10),
		]).copy (this.src, 1)

	}
	
	getCount () {
		return this.src.readInt32LE (4)
	}

	setCount (v) {
		return this.src.writeInt32LE (v, 4)
	}
	
	parse () {
	
		let {src, lowerCaseFieldNames, encoder, decoder} = this

		this.ver    = src.readUInt8 (0)
		this._step  = src.readInt16LE (10)
		
		if (src.readUInt8 (1) < 83) this._epoch = 2000
		
		this._epoch
				
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
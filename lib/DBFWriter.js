const  EOF        = Buffer.alloc (1, 26)

const {DBFHeader} = require ('./DBFHeader')
const {Transform} = require ('stream')

const DBFWriter = class extends Transform {

	constructor (options) {

		let {header} = options; if (!header) throw new Error ('No header provided')

		options.writableObjectMode = true

		super (options)

		this.header = header

		this.push (this.header.src)

	}

	_flush (callback) {

		this.push (EOF)

		callback ()
	
	}
	
	_transform (data, _, callback) {
			
		let {header} = this
		
		let buffer = Buffer.alloc (header._step, 32)
		
		for (let field of header.fields) {
		
			let {name} = field; if (!(name in data)) continue
			
			let v = data [name]; if (v == null) continue
			
			try {

				field.set_value (buffer, v)

			}
			catch (x) {				

				return callback (x)

			}
			
		}

		this.push (buffer)

		callback ()
	
	}
	
}

DBFWriter.from = async function (is, options = {}) {

	let {count, date, encoding, encoder, lowerCaseFieldNames} = options

	if (lowerCaseFieldNames !== false) lowerCaseFieldNames = true
	
	let header = await DBFHeader.from (is, {encoding, encoder, lowerCaseFieldNames})

	if (count != null) header.setCount (count)
	if (date  != null) header.setDate  (date)
	
	let writer = new DBFWriter ({header})

	return writer

}

DBFWriter.copyHeader = async function (is, os) {
	
	let writer = await DBFWriter.from (is, {count: 0})

	return new Promise ((ok, fail) => {
		
		os.on ('error', fail)
		writer.on ('error', fail)

		os.on ('close', ok)

		writer.pipe (os)
		writer.end ()

	})

}

module.exports = {DBFWriter}
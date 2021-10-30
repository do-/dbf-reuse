const {DBFHeader} = require ('./DBFHeader')
const {Transform} = require ('stream')

const DBFWriter = class extends Transform {

	constructor (options) {

		let {header} = options; if (!header) throw new Error ('No header provided')

		options.writableObjectMode = true

		super (options)

		this.header = header

		this.push (this.header.src)
		this.push (Buffer.alloc (1, 13))

//		this.is_header_dumped = false

	}
/*	
	check_header () {
	
		if (this.is_header_dumped) return 
		
		this.push (this.header.src)
		this.push (Buffer.alloc (1, 13))

		this.is_header_dumped = true
	
	}
*/		
	_flush () {

		this.push (Buffer.alloc (1, 26))
	
	}
	
	_transform (data, _, callback) {
	
//		this.check_header ()
		
		let {header} = this
		
		let buffer = Buffer.alloc (header.step, 32)
		
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

		callback ()
	
	}
	
}

DBFWriter.from = async function (is, options: {count, date, encoder, lowerCaseFieldNames}) {
	
	if (lowerCaseFieldNames !== false) lowerCaseFieldNames = true
	
	let header = await DBFHeader.from (is, {lowerCaseFieldNames})

	if (count != null) header.setCount (count)
	if (date  != null) header.setDate  (date)
	
	let writer = new DBFWriter (header)

}

module.exports = {DBFWriter}
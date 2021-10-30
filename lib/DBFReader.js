const {Transform} = require ('stream')

const DBFReader = class extends Transform {

	constructor (options = {}) {
	
		options.readableObjectMode = true
				
		super (options)
		
		for (let k of ['no_data', 'deletedFieldName']) if (k in options) this [k] = options [k]
		
		if (!('lowerCaseFieldNames' in options)) options.lowerCaseFieldNames = true
		
		let {lowerCaseFieldNames, decoder} = options

		this.header = new ((require ('./DBFHeader')).DBFHeader) ({lowerCaseFieldNames, decoder})
			
	}
		
	_transform (data, _, callback) {

		let {header} = this; if (!header.ver) data = header.cut_header (data)
		
		if (this.no_data) this.destroy ()
		
		this.buffer = !this.buffer ? data : Buffer.concat ([this.buffer, data], this.buffer.length + data.length)
		
		let {buffer, deletedFieldName} = this, {_step} = header, {length} = buffer, pos = 0, o; while (true) {
		
			let next = pos + _step; if (next > length) break
			
			if (buffer [pos] == 32) { // not deleted
				o = {}
			}
			else {
				if (!deletedFieldName) continue
				o = {[deletedFieldName]: true}
			}
						
			for (let field of header.fields) o [field.name] = field.get_value (buffer, pos)
										
			this.push (o)

			pos = next
		
		}
		
		this.buffer = this.buffer.slice (pos)
		
		callback ()
	
	}
	
}

module.exports = {DBFReader}
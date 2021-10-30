////////////////////////////////////////////////////////////////////////////////

const DBFField = class {

	constructor (options) {

		let {from, src, decoder} = options; 

		this._pos = {from}

		if (decoder) this._decoder = decoder

		if (src) {
			this._src = src
			this.parse ()
		}

	}
	
	parse () {
	
		let {_src} = this
				
		this.name = _src.toString ('ascii', 0, _src.indexOf (0) || 10)
		
		this.type = String.fromCharCode (_src [11])
		
		this.size = _src.readUInt8 (16)
		
		this._pos.to = this._pos.from + this.size
		
		this._null_if_blank = 
			this.type == 'C' ? 0 : // C[HAR] values are left justified
			this.size - 1          // all other are left padded / fixed width
		
		if (this.type == 'N') this.prec = _src.readUInt8 (17)

		if (this.type != 'C') delete this._decoder
		if (!this._decoder) this._decoder = b => b.toString ('ascii')
	
	}
	
	get_value (buffer, pos) {

		let {_pos: {from, to}, _null_if_blank} = this

		if (buffer [pos + from + _null_if_blank] === 32) return null

		let s = this._decoder (buffer.slice (pos + from, pos + to))

		if (this.type === 'D') return s.slice (0, 4) + '-' + s.slice (4, 6) + '-' + s.slice (6, 8)

		return s.trim ()

	}
	
}

module.exports = {DBFField}
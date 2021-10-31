////////////////////////////////////////////////////////////////////////////////

const DBFField = class {

	constructor (options) {

		let {from, src, decoder} = options; 

		this._pos = {from}
		
		for (let k of ['encoder', 'decoder']) if (k in options) this ['_' + k] = options [k]

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

		if (this.type != 'C') for (let k of ['encoder', 'decoder']) delete ['_' + k]
		
		if (!this._decoder) this._decoder = b => b.toString ('ascii')
		if (!this._encoder) this._encoder = s => Buffer.from (s, 'ascii')

	}
	
	get_value (buffer, pos) {

		let {_pos: {from, to}, _null_if_blank} = this

		if (buffer [pos + from + _null_if_blank] === 32) return null

		let s = this._decoder (buffer.slice (pos + from, pos + to))

		if (this.type === 'D') return s.slice (0, 4) + '-' + s.slice (4, 6) + '-' + s.slice (6, 8)

		return s.trim ()

	}

	to_string (value) {
	
		switch (this.type) {		
			case 'N':
			default:
				return '' + value
		}
	
	}

	to_buffer_d (value) {
	
		if (Number.isInteger (value)) value = new Date (value)
		
		if (value instanceof Date) return this.to_buffer_d_from_date (value)

		if (typeof value == 'string' || value instanceof String) return this.to_buffer_d_from_string (value)
		
		throw new Error (`Invalid data for column ${this.name}: ${v}`)
	
	}
	
	to_buffer_d_from_date (value) {
	
		let b = Buffer.from (value.getFullYear () + '0000')
		
		let m = value.getMonth () + 1
		if (m > 9) {
			b [4] = 49
			m -= 10
		}
		b [5] = m + 48

		let d = value.getDate ()
		if (d > 9) {
			b [6] = 49
			d -= 10
		}
		d [7] = m + 48

		return b

	}

	to_buffer_d_from_string (value) {
	
		if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}/.test (value)) throw new Error (`Invalid date format for column ${this.name}: ${value}`)

		let b = Buffer.alloc (8), [yyyy, mm, dd] = value.split ('-')
		
		b.write (yyyy)
		b.write (mm, 4)
		b.write (dd, 6)
	
		return b

	}
	
	to_buffer (value) {
	
		switch (this.type) {
		
			case 'D' : return this.to_buffer_d (value)
			
			default  : return this._encoder (this.to_string (value))
		
		}
		
	}
	
	set_value (buffer, value) {
	
		let b = this.to_buffer (value)
		
		let {length} = b; if (length > this.size) throw new Error (`Data too long for column ${this.name}: ${s}`)

		let pos = this._pos.from
		
		if (this.type === 'N') pos += (this.size - length)
		
		b.copy (buffer, pos)
		
	}
	
}

module.exports = {DBFField}
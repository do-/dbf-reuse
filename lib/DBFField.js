////////////////////////////////////////////////////////////////////////////////

const ZERO_ISO_DATE = Buffer.from ('0000-00-00', 'ascii')

const DBFField = class {

	constructor (options) {

		let {from, src} = options; 

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
		
		let start = pos + from

		if (buffer [start + _null_if_blank] === 32) return null
		
		switch (this.type) {
		
			case 'D':

				let b = Buffer.from (ZERO_ISO_DATE)

				let sp = start, ep = sp + 4		
				buffer.copy (b, 0, sp, ep)

				sp = ep; ep ++; ep ++
				buffer.copy (b, 5, sp, ep)

				sp = ep; ep ++; ep ++
				buffer.copy (b, 8, sp, ep)

				return b.toString ('ascii')
			
			default:

				let s = this._decoder (buffer.slice (start, pos + to))

				if (typeof s.trim === 'function') return s.trim ()

				return s

		}


	}

	to_string (value) {
	
		switch (this.type) {		
		
			case 'D':
				
				let v = Number.isInteger (value) ? new Date (value) : value
			
				if (v instanceof Date) {

					let off = v.getTimezoneOffset ()

					if (off != 0) v.setMinutes (v.getMinutes () - off)

					v = v.toJSON ().slice (0, 10)

				}

				if (typeof v !== 'string') throw new Error (`Invalid data for column ${this.name}: ${value}`)

				let _ymd = /^([0-9]{4})-([0-9]{2})-([0-9]{2})/.exec (v); if (!_ymd) throw new Error (`Invalid data for column ${this.name}: ${value}`)

				let [_, y, m, d] = _ymd; return y + m + d
			
			case 'N':
			
				let {prec} = this; if (prec) {

					let v = typeof value === 'string' ? parseFloat (value) : value

					if (isNaN (v)) throw new Error (`Invalid data for column ${this.name}: ${value}`)

					return v.toFixed (prec)

				}
				else {

					let v = typeof value === 'string' ? parseInt (value) : value

					if (isNaN (v)) throw new Error (`Invalid data for column ${this.name}: ${value}`)

					return v.toString ()

				}

			default:
			
				return '' + value
				
		}
	
	}

	set_value (buffer, value) {
	
		let s = this.to_string (value)

		let b = this._encoder (s)
		
		let {length} = b; if (length > this.size) throw new Error (`Data too long for column ${this.name}: ${value}`)

		let pos = this._pos.from
		
		if (this.type === 'N') pos += (this.size - length)
		
		b.copy (buffer, pos)
		
	}
	
}

module.exports = {DBFField}
const params = {
	server: {
		host: '0.0.0.0',
		port: parseInt(process.env.PORT, 10) || 3004,
		get url() {
			return `http://${this.host}:${this.port}`
		},
	},
}

export default params

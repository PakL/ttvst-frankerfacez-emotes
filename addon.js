const path = require("path")
const fs = require('fs')

const request = require(path.dirname(module.parent.filename) + '/../node_modules/request')

class FrankerFaceZEmotes {

	constructor(tool)
	{
		const self = this
		this._tool = tool

		this.emoticonDrawer = null
		this.channelEmotes = {}

		this._tool.on('load', async () => {
			self.emoticonDrawer = document.querySelector('#chat_message_emotes_emoticons')
		})
		this._tool.cockpit.on('channelopen', async () => {
			self.channelEmotes = {}
			try {
				self.channelEmotes = await self.loadEmotes(self._tool.cockpit.openChannelObject.login)
			} catch(e) {}
			self.fillInEmotes()
		})
	}

	loadEmotes(channel)
	{
		if(typeof(channel) !== 'string') channel = ''
		if(channel.length <= 0) reject(new Error('Channel name is empty'))
		return new Promise((resolve, reject) => {
			request({
				method: 'GET',
				uri: 'https://api.frankerfacez.com/v1/room/' + encodeURIComponent(channel),
				json: true
			}, (error, response, body) => {
				if(error) {
					reject(error)
				} else {
					if(response.statusCode !== 200) {
						reject(new Error(response.statusCode + ' - ' + response.statusMessage))
					} else {
						if(typeof(body) == 'object' && body.hasOwnProperty('room') && body.hasOwnProperty('sets')) {
							resolve(body)
						} else{
							reject(new Error('Unexpetected response. Maybe the API has changed?'))
						}
					}
				}
			})
		})
	}

	waitForTwitchEmotes()
	{
		const self = this
		return new Promise((resolve, reject) => {
			if(!self._tool.cockpit.emotesLoaded) {
				setTimeout(() => {
					self.waitForTwitchEmotes().then(() => {
						resolve()
					}).catch((e) => {
						reject()
					})
				}, 1000)
			} else {
				resolve()
			}
		})
	}

	async fillInEmotes()
	{
		await this.waitForTwitchEmotes()

		let emoteSets = []
		
		if(this.channelEmotes.hasOwnProperty('sets')) {
			for(let esetIndex in this.channelEmotes.sets) {
				if(!this.channelEmotes.sets.hasOwnProperty(esetIndex)) continue
				let channelEmoteSet = []
				let eset = this.channelEmotes.sets[esetIndex]
				for(let emIndex in eset.emoticons) {
					if(!eset.emoticons.hasOwnProperty(emIndex)) continue
					let em = eset.emoticons[emIndex]
					if(em.urls['1'].startsWith('//')) em.urls['1'] = 'https:' + em.urls['1']
					channelEmoteSet.push({
						code: em.name,
						url: em.urls['1']
					})
				}
				if(channelEmoteSet.length > 0) emoteSets.push(channelEmoteSet)
			}
		}
		if(this.emoticonDrawer != null && this.emoticonDrawer.hasOwnProperty('_tag')) {
			this.emoticonDrawer._tag.setemotes(emoteSets.concat(this.emoticonDrawer._tag.emotes))
		}
	}

	findAndReplaceInMessage(message) {
		let replacings = []
		let emotes = []
		if(this.channelEmotes.hasOwnProperty('sets')) {
			for(let esetIndex in this.channelEmotes.sets) {
				if(!this.channelEmotes.sets.hasOwnProperty(esetIndex)) continue
				let eset = this.channelEmotes.sets[esetIndex]
				for(let emIndex in eset.emoticons) {
					if(!eset.emoticons.hasOwnProperty(emIndex)) continue
					let em = eset.emoticons[emIndex]
					if(em.urls['1'].startsWith('//')) em.urls['1'] = 'https:' + em.urls['1']
					emotes.push({
						code: em.name,
						url: em.urls['1']
					})
				}
			}
		}

		for(let i = 0; i < emotes.length; i++) {
			var e = emotes[i]

			var regex = new RegExp('(\\s|^)('+e.code.replace('(', '\\(').replace(')', '\\)')+')($|\\s)', 'g')
			var matched = false
			while(match = regex.exec(message)) {
				regex.lastIndex = match.index+1
				var ni = -1

				var start = match.index
				if(match[1].length > 0) start++
				var end = start+match[2].length-1
				ni = end+1

				replacings.push({
					'replaceWith': '<img src="' + e.url + '" srcset="' + e.url + ' 1x, ' + e.url.replace(/\/1$/, '/2') + ' 2x, ' + e.url.replace(/\/1$/, '/4') + ' 4x" alt="{__NEEDLE__}" title="{__NEEDLE__}" class="emote">',
					'start': start,
					'end': end
				})
			}
		}
		return replacings
	}

}
module.exports = FrankerFaceZEmotes
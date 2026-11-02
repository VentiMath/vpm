'use strict';
// Independent gRPC length-prefix decoder. It owns every byte kept across writes
// and uses geometric storage instead of one retained Buffer view per fragment.
class StreamDecoder {
    #header = Buffer.allocUnsafe(5);
    #headerBytes = 0;
    #frame = null;
    #used = 0;
    #total = 0;
    #failure = null;
    #limit;
    constructor(maxReadMessageLength) { this.#limit = maxReadMessageLength; }
    #length(size) {
        if (this.#limit !== -1 && size > this.#limit) {
            this.#frame = null;
            this.#failure = new Error(`Received message larger than max (${size} vs ${this.#limit})`);
            throw this.#failure;
        }
        this.#total = size + 5;
    }
    write(data) {
        if (this.#failure) throw this.#failure;
        const messages = [];
        let offset = 0;
        while (offset < data.length) {
            if (this.#headerBytes === 0 && data.length - offset >= 5) {
                this.#length(data.readUInt32BE(offset + 1));
                if (this.#total <= data.length - offset) {
                    messages.push(Buffer.from(data.subarray(offset, offset + this.#total)));
                    offset += this.#total;
                    continue;
                }
            }
            if (this.#headerBytes < 5) {
                const amount = Math.min(5 - this.#headerBytes, data.length - offset);
                data.copy(this.#header, this.#headerBytes, offset, offset + amount);
                this.#headerBytes += amount;
                offset += amount;
                if (this.#headerBytes !== 5) continue;
                this.#length(this.#header.readUInt32BE(1));
                this.#used = 5;
                if (this.#total === 5) {
                    messages.push(Buffer.from(this.#header));
                    this.#headerBytes = 0;
                    continue;
                }
            }
            const amount = Math.min(this.#total - this.#used, data.length - offset);
            if (amount === 0) continue;
            const needed = this.#used + amount;
            if (this.#frame === null || this.#frame.length < needed) {
                // Grow the payload in powers of two, separately from its five-byte
                // header. Otherwise a power-of-two payload needs an extra full
                // reallocation just to accommodate those last five bytes.
                const previous = this.#frame === null ? 0 : this.#frame.length - 5;
                const payload = 2 ** Math.ceil(Math.log2(Math.max(256, needed - 5, previous * 4)));
                const capacity = Math.min(this.#total, payload + 5);
                const next = Buffer.allocUnsafe(capacity);
                if (this.#frame === null) this.#header.copy(next);
                else this.#frame.copy(next, 0, 0, this.#used);
                this.#frame = next;
            }
            data.copy(this.#frame, this.#used, offset, offset + amount);
            this.#used = needed;
            offset += amount;
            if (this.#used === this.#total) {
                messages.push(this.#frame);
                this.#frame = null;
                this.#headerBytes = 0;
                this.#used = 0;
            }
        }
        return messages;
    }
}
exports.StreamDecoder = StreamDecoder;

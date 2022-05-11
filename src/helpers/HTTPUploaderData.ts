export class HTTPUploaderData {
    private readonly length;
    private _data;
    private readonly _total;

    /**
     * Constructor for HTTPUploaderData class
     * @param length - length of bytes
     */
    constructor(length) {
        this.length = length;
        this._data = null;
        this._total = [ 0 ];
    }

    /**
     * Create buffer bytes from string
     */
    public preAllocate(): void {
        const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const multiplier = Number((Math.round(this.length.toFixed() / 36.0)).toFixed());
        const repeatedChars = chars.repeat(multiplier);

        this._data = "content1=" + Buffer.from(repeatedChars.slice(0, Number(this.length.toFixed()) - 9));
    }

    /**
     * _data getter
     */
    get data() {
        return this._data;
    }

    /**
     * total getter
     */
    get total() {
        return this._total;
    }

    public read(n = 10240) {
        const chunk = this.data.slice(0, n);
        this._total.push(chunk.length);
        return chunk;
    }
}

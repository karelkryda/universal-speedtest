import { FastAPI } from '../index';
test('Run test', async () => {
    const FastTest = new FastAPI({
        measureUpload: true,
        timeout: 60000
    });
    expect(await FastTest.runTest().then(result => {
        return result;
    }).catch((err) => console.log(err))).toBe('Hello Carl');
});
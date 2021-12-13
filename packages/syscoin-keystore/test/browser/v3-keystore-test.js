

describe('V3 Keystore', () => {

  it('encrypt / decrypt', async () => {

    const phrase = "solution rookie cake shine hand attack claw awful harsh level case vocal";

    const jsonKey = await syscoinWeb3.keyStore.encryptPhrase(phrase, 'password');

    const phrase2 = await syscoinWeb3.keyStore.decryptPhrase(jsonKey, 'password');

    chai.expect(phrase2).to.equal(phrase);
  });

});

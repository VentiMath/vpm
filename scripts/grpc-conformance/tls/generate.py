"""Generate public test-only TLS material matching upstream's certificate names/SANs.
The CA signing key is temporary and is never saved in the repository.
"""
from pathlib import Path
import subprocess,tempfile,hashlib,json
out=Path(__file__).resolve().parent
with tempfile.TemporaryDirectory(prefix='vgrpc-test-ca-') as tmp:
    tmp=Path(tmp)
    def run(*args):subprocess.run(['openssl',*map(str,args)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    subject='/C=US/ST=Illinois/L=Chicago/O=Example, Co./CN=*.test.google.com'
    run('req','-x509','-newkey','rsa:2048','-nodes','-sha256','-days','3650','-keyout',tmp/'ca.key','-out',out/'ca.pem','-subj',subject,'-addext','basicConstraints=critical,CA:TRUE','-addext','keyUsage=critical,keyCertSign,cRLSign')
    run('req','-new','-newkey','rsa:2048','-nodes','-sha256','-keyout',out/'server1.key','-out',tmp/'server.csr','-subj',subject)
    (tmp/'extensions').write_text('basicConstraints=CA:FALSE\nkeyUsage=digitalSignature,nonRepudiation,keyEncipherment\nsubjectAltName=DNS:*.test.google.fr,DNS:waterzooi.test.google.be,DNS:*.test.youtube.com,IP:192.168.1.3\nsubjectKeyIdentifier=hash\nauthorityKeyIdentifier=keyid,issuer\n')
    run('x509','-req','-in',tmp/'server.csr','-CA',out/'ca.pem','-CAkey',tmp/'ca.key','-CAserial',tmp/'serial','-CAcreateserial','-days','3650','-sha256','-extfile',tmp/'extensions','-out',out/'server1.pem')

(out/'SHA256.json').write_text(json.dumps({f:hashlib.sha256((out/f).read_bytes()).hexdigest() for f in ['ca.pem','server1.pem','server1.key']},indent=2)+'\n')

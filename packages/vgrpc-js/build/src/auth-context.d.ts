import { PeerCertificate } from './platform';
export interface AuthContext {
    transportSecurityType?: string;
    sslPeerCertificate?: PeerCertificate;
}

'use strict';
const {registerRole}=require('../security/roles.js');
function requiresRole(role){
  const parts=typeof role==='string'?role.split('/'):[];
  const validName=value=>typeof value==='string'&&/^[a-zA-Z0-9_.-]+$/.test(value);
  const valid=parts.length===2&&parts[0]==='roles'&&validName(parts[1]) || parts.length===4&&['projects','organizations'].includes(parts[0])&&/^[a-zA-Z0-9_-]+$/.test(parts[1])&&parts[2]==='roles'&&validName(parts[3]);
  if(!valid)throw new Error(`Invalid role: "${role}". Role must be a valid GCP IAM role format (e.g., "roles/viewer", "projects/<project-id>/roles/<custom-role>", or "organizations/<org-id>/roles/<custom-role>").`);
  registerRole(role);
}
module.exports={requiresRole};

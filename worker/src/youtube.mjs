import fs from 'node:fs';
import {google} from 'googleapis';
export async function uploadVideo({connection,file,thumbnail,title,description,tags=[],privacyStatus='private',publishAt}){
  const auth=new google.auth.OAuth2();auth.setCredentials({refresh_token:connection.refreshToken});
  const yt=google.youtube({version:'v3',auth});
  const status={privacyStatus}; if(publishAt) {status.privacyStatus='private';status.publishAt=publishAt;}
  const r=await yt.videos.insert({part:['snippet','status'],requestBody:{snippet:{title,description,tags,categoryId:'25'},status},media:{body:fs.createReadStream(file)}});
  if (thumbnail) {
    await yt.thumbnails.set({ videoId: r.data.id, media: { body: fs.createReadStream(thumbnail) } });
  }
  return r.data;
}

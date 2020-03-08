const fs = require('fs').promises
const OS = require('opensubtitles-api');
const OpenSubtitles = new OS('TemporaryUserAgent');

const dir = 'E:\\Downloads\\2020-02\\The Office US\\The Office US S03 (360p re-webrip)'

const video_file_types = ['mp4', 'avi', 'mkv'];
const subtitle_file_types = ['srt', 'sub'];

const subtitle_languages = ['cze' , 'eng']


async function run()
{
    var files = await fs.readdir(dir)
        .then(res => {
            var files = [];
            
            res.forEach(f => {
                let suffix = f.substr(-3);
                let name = f.substr(0, f.length-4);
                if (video_file_types.indexOf(suffix)!==-1)
                {
                    files.push({
                        name: name,
                        suffix: suffix,
                        video_file: f,
                        subtitles_file: null
                    })
                }
                if (subtitle_file_types.indexOf(suffix)!==-1)
                {
                    let item = files.find(f=>f.name==name && !f.subtitles_file)
                    if (item)
                    {
                        item.subtitles_file = f;
                    }
                }
                
            })
            return files;
        })
        .catch(err => console.error(err))
    
    var filesToCheck = files.filter(f => !f.subtitles_file);
    
    await asyncForEach(filesToCheck, async (f) => {
        console.log('Searching for ' + f.name);
        var url = await OpenSubtitles.search({
                      sublanguageid: subtitle_languages.join(','),
                      path: dir + '\\' + f.video_file,
                      extensions: subtitle_file_types,
                  })
                  .then(res => {
                      if (res.cs)
                      {
                        console.log('found CZ');
                          return {
                            url: res.cs.utf8,
                            suffix: res.cs.filename.substr(-3)
                          }
                      }
                      else if (res.en) {
                      console.log('found EN');
                          return {
                            url: res.en.utf8,
                            suffix: res.en.filename.substr(-3)
                          }
                      }
                      else
                      {
                          console.log('SRT not found', res);
                          return;
                      }
                  })
                  .catch(err => console.error(err))
        if (url)
        {
            console.log('Downloading subtitles from ' + url.url)
            
            var subtitles = await getContent(url.url);
            
            if (subtitles)
            {
                let subfile = dir + '\\' + f.name + '.' + url.suffix;
                await fs.open(subfile, 'w')
                  .then(filehandle => filehandle.write(subtitles))
                  .catch((err) => console.error(err));
            
            }
            
        }
    })
    
}

run();

const getContent = function(url) {
  // return new pending promise
  return new Promise((resolve, reject) => {
    // select http or https module, depending on reqested url
    const lib = url.startsWith('https') ? require('https') : require('http');
    const request = lib.get(url, (response) => {
      // handle http errors
      if (response.statusCode < 200 || response.statusCode > 299) {
         reject(new Error('Failed to load page, status code: ' + response.statusCode));
       }
      // temporary data holder
      const body = [];
      // on every content chunk, push it to the data array
      response.on('data', (chunk) => body.push(chunk));
      // we are done, resolve promise with those joined chunks
      response.on('end', () => resolve(body.join('')));
    });
    // handle connection errors of the request
    request.on('error', (err) => reject(err))
    })
};

async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}
const fs = require('fs');
const path = require('path');

function listDirectories(dirPath) {
  try {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    const directories = items
      .filter(item => item.isDirectory())
      .map(item => path.join(dirPath, item.name));
    
    return directories;
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error.message);
    return [];
  }
}

function listDirectoriesRecursively(dirPath) {
  const directories = [dirPath];
  const subdirs = listDirectories(dirPath);
  
  subdirs.forEach(subdir => {
    directories.push(...listDirectoriesRecursively(subdir));
  });
  
  return directories;
}

// List all directories in backend folder
const backendDirs = listDirectoriesRecursively('backend');
backendDirs.forEach(dir => console.log(dir));
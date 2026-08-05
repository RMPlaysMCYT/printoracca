import React, { useState, useEffect } from "react";

interface FileItem {
  name: string;
  isFolder: boolean;
  path: string;
}

export default function FileExplorer() {
  const [currentPath, setCurrentPath] = useState<string>("");
  const [items, setItems] = useState<FileItem[]>([]);
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    async function FileInit() {
      const home = await homedir();
      setCurrentPath(home);
      loadDirectory(home);
    }
    FileInit();
  }, []);
}

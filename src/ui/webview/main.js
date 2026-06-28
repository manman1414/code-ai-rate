/**
 * 侧边栏 Webview 客户端脚本
 * @author Cursor Agent
 * @date 2026-06-28
 */

(function () {
  const vscode = acquireVsCodeApi();

  const btnScan = document.getElementById('btn-scan');
  const btnExport = document.getElementById('btn-export');
  const btnCancel = document.getElementById('btn-cancel');
  const scanProgress = document.getElementById('scan-progress');
  const progressFill = document.getElementById('progress-fill');
  const progressDone = document.getElementById('progress-done');
  const progressTotal = document.getElementById('progress-total');
  const projectRate = document.getElementById('project-rate');
  const rateFill = document.getElementById('rate-fill');
  const workspaceName = document.getElementById('workspace-name');
  const statFiles = document.getElementById('stat-files');
  const statLines = document.getElementById('stat-lines');
  const statAnalyzed = document.getElementById('stat-analyzed');
  const statSkipped = document.getElementById('stat-skipped');
  const topFilesList = document.getElementById('top-files-list');

  const distBars = {
    '0-30': document.getElementById('dist-0-30'),
    '31-60': document.getElementById('dist-31-60'),
    '61-100': document.getElementById('dist-61-100'),
  };
  const distCounts = {
    '0-30': document.getElementById('count-0-30'),
    '31-60': document.getElementById('count-31-60'),
    '61-100': document.getElementById('count-61-100'),
  };

  btnScan.addEventListener('click', () => {
    vscode.postMessage({ type: 'scan' });
  });

  btnExport.addEventListener('click', () => {
    vscode.postMessage({ type: 'export' });
  });

  btnCancel.addEventListener('click', () => {
    vscode.postMessage({ type: 'cancel' });
  });

  window.addEventListener('message', (event) => {
    const message = event.data;
    switch (message.type) {
      case 'scanResult':
        renderScanResult(message.payload);
        break;
      case 'scanProgress':
        renderProgress(message.done, message.total);
        break;
      case 'scanState':
        renderState(message.status);
        break;
    }
  });

  function renderState(status) {
    const isRunning = status === 'running';

    btnScan.disabled = isRunning;
    btnExport.disabled = isRunning;
    btnCancel.classList.toggle('hidden', !isRunning);
    scanProgress.classList.toggle('hidden', !isRunning);

    if (status === 'idle') {
      resetProgress();
    }
  }

  function renderProgress(done, total) {
    scanProgress.classList.remove('hidden');
    progressDone.textContent = String(done);
    progressTotal.textContent = String(total);

    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    progressFill.style.width = pct + '%';
  }

  function resetProgress() {
    progressDone.textContent = '0';
    progressTotal.textContent = '0';
    progressFill.style.width = '0%';
  }

  function renderScanResult(result) {
    if (!result || !result.summary) {
      return;
    }

    const { summary, topFiles, workspaceName: wsName } = result;

    projectRate.textContent = formatRate(summary.projectAiRate);
    rateFill.style.width = Math.min(summary.projectAiRate, 100) + '%';
    workspaceName.textContent = wsName || '';

    statFiles.textContent = formatNumber(summary.totalFiles);
    statLines.textContent = formatNumber(summary.totalCodeLines);
    statAnalyzed.textContent = formatNumber(summary.analyzedFiles);
    statSkipped.textContent = formatNumber(summary.skippedFiles);

    renderDistribution(summary.scoreDistribution, summary.analyzedFiles);
    renderTopFiles(topFiles || []);

    btnExport.disabled = result.status === 'running';
  }

  function renderDistribution(distribution, total) {
    const buckets = ['0-30', '31-60', '61-100'];
    const maxCount = Math.max(...buckets.map((k) => (distribution[k] || 0)), 1);

    for (const key of buckets) {
      const count = distribution[key] || 0;
      distCounts[key].textContent = String(count);
      const barPct = total > 0 ? (count / maxCount) * 100 : 0;
      distBars[key].style.width = barPct + '%';
    }
  }

  function renderTopFiles(files) {
    topFilesList.innerHTML = '';

    if (!files.length) {
      const li = document.createElement('li');
      li.className = 'empty-hint';
      li.textContent = '暂无数据';
      topFilesList.appendChild(li);
      return;
    }

    for (const file of files) {
      const li = document.createElement('li');
      li.className = 'file-item';
      li.title = file.relativePath;

      const score = document.createElement('span');
      score.className = 'file-score';
      score.textContent = Math.round(file.fileScore);

      const scoreBar = document.createElement('div');
      scoreBar.className = 'file-score-bar';
      const scoreBarFill = document.createElement('div');
      scoreBarFill.className = 'file-score-bar-fill';
      scoreBarFill.style.width = Math.min(file.fileScore, 100) + '%';
      scoreBar.appendChild(scoreBarFill);

      const path = document.createElement('span');
      path.className = 'file-path';
      path.textContent = file.relativePath;

      li.appendChild(score);
      li.appendChild(scoreBar);
      li.appendChild(path);

      li.addEventListener('click', () => {
        vscode.postMessage({ type: 'openFile', relativePath: file.relativePath });
      });

      topFilesList.appendChild(li);
    }
  }

  function formatRate(value) {
    if (value === undefined || value === null) {
      return '—';
    }
    return Number(value).toFixed(1);
  }

  function formatNumber(value) {
    if (value === undefined || value === null) {
      return '—';
    }
    return String(value);
  }
})();

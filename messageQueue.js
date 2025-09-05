// 全局消息队列，通过 window.msgQueue.push(text) 使用
(function () {
    if (window.msgQueue) return; // 防止重复注入

    const QUEUE_ID = 'ydsd-msg-queue';
    const MAX_LIFETIME = 20000; // 20s

    // 创建容器
    const container = document.createElement('div');
    container.id = QUEUE_ID;
    Object.assign(container.style, {
        position: 'fixed',
        right: '16px',
        bottom: '16px',
        zIndex: 999999,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        pointerEvents: 'none'
    });
    document.documentElement.appendChild(container);

    function push(message) {
        if (!message) return;
        const item = document.createElement('div');
        item.textContent = `${new Date().toLocaleTimeString()}  ${message}`;
        Object.assign(item.style, {
            background: 'rgba(0,0,0,0.8)',
            color: '#fff',
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            maxWidth: '300px',
            pointerEvents: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all'
        });
        container.prepend(item);

        setTimeout(() => {
            item.style.transition = 'opacity 0.5s';
            item.style.opacity = '0';
            setTimeout(() => item.remove(), 500);
        }, MAX_LIFETIME);
    }

    window.msgQueue = { push };
})(); 
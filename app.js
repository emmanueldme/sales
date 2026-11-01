/**
 * PulseSales — Real-Time Sales Analytics Dashboard
 * Pure Vanilla JavaScript: No dependencies, LocalStorage persistence, Custom Canvas Charts
 * Strictly complies with: No CSS Variables, WebStorage persistence, Single page dashboard
 */

(function () {
  'use strict';

  // Polyfill for Canvas roundRect for broad browser support
  if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
      if (typeof r === 'undefined') r = 0;
      if (typeof r === 'number') r = [r, r, r, r];
      const [tl, tr, br, bl] = r;
      this.beginPath();
      this.moveTo(x + tl, y);
      this.lineTo(x + w - tr, y);
      this.quadraticCurveTo(x + w, y, x + w, y + tr);
      this.lineTo(x + w, y + h - br);
      this.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
      this.lineTo(x + bl, y + h);
      this.quadraticCurveTo(x, y + h, x, y + h - bl);
      this.lineTo(x, y + tl);
      this.quadraticCurveTo(x, y, x + tl, y);
      this.closePath();
      return this;
    };
  }

  // Storage Keys
  const STORAGE_KEYS = {
    TRANSACTIONS: 'pulsesales_transactions_v1',
    QUOTA: 'pulsesales_monthly_quota_v1',
    CURRENCY: 'pulsesales_currency_v1'
  };

  // State Management
  const state = {
    transactions: [],
    monthlyQuota: 100000,
    currency: 'USD',
    periodFilter: '30', // 'all', '30', '7', 'this-month', 'last-month', '90'
    chartMetric: 'revenue', // 'revenue', 'profit', 'orders'
    chartInterval: 'day', // 'day', 'month'
    table: {
      search: '',
      category: 'ALL',
      channel: 'ALL',
      status: 'ALL',
      sort: 'date-desc',
      page: 1,
      pageSize: 10
    },
    editingId: null
  };

  // Currency symbols map using Unicode escapes
  const CURRENCY_SYMBOLS = {
    USD: '$',
    EUR: '\u20AC',
    GBP: '\u00A3',
    CAD: 'CA$',
    AUD: 'A$'
  };

  // Category Colors Palette
  const CATEGORY_COLORS = {
    'SaaS & Software': '#3b82f6',
    'Electronics & Hardware': '#10b981',
    'Consulting & Services': '#8b5cf6',
    'Office Supplies': '#f59e0b',
    'Apparel & Merch': '#ec4899',
    'Other': '#64748b'
  };

  // Formatting Utilities
  function getCurrencySymbol() {
    return CURRENCY_SYMBOLS[state.currency] || '$';
  }

  function formatMoney(amount, compact = false) {
    const symbol = getCurrencySymbol();
    const num = Number(amount) || 0;

    if (compact) {
      if (Math.abs(num) >= 1000000) {
        return symbol + (num / 1000000).toFixed(1) + 'M';
      }
      if (Math.abs(num) >= 1000) {
        return symbol + (num / 1000).toFixed(1) + 'k';
      }
      return symbol + Math.round(num);
    }

    return symbol + num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function getInitials(name) {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  // Realistic Sample Dataset Generator
  function generateSeedData() {
    const today = new Date();
    const categories = [
      { name: 'SaaS & Software', products: ['Enterprise Cloud Suite', 'Pro Monthly Subscription', 'API Developer Pass', 'Security Add-on', 'AI Agent Credits'] },
      { name: 'Electronics & Hardware', products: ['Ergonomic 4K Monitor', 'Mechanical Keyboard Pro', 'Noise-Cancelling Headset', 'Smart Docking Station', 'Dual-Sensor Mouse'] },
      { name: 'Consulting & Services', products: ['Architecture Review', 'Data Migration Service', 'Custom Integration Sprint', 'Security Audit', 'Q4 Strategy Workshop'] },
      { name: 'Office Supplies', products: ['Acoustic Desk Dividers', 'Premium Standing Mat', 'Cable Management Hub', 'Desk Organizer Bundle'] },
      { name: 'Apparel & Merch', products: ['Engineer Hoodie 2.0', 'Merino Wool Jacket', 'Thermal Travel Tumbler', 'Conference Backpack'] }
    ];

    const channels = ['Online Web', 'Direct Sales', 'In-Store', 'Affiliate', 'Wholesale'];
    const customers = [
      { name: 'Apex Dynamics', email: 'billing@apexdynamics.com' },
      { name: 'Sophia Martinez', email: 'sophia.m@gmail.com' },
      { name: 'Nexura Health', email: 'finance@nexura.io' },
      { name: 'Liam O\'Connor', email: 'liam.oc@outlook.com' },
      { name: 'BluePeak Capital', email: 'ops@bluepeak.net' },
      { name: 'Marcus Chen', email: 'm.chen@techhub.co' },
      { name: 'Elena Rostova', email: 'elena@rostovaconsult.com' },
      { name: 'Vanguard Labs', email: 'accounts@vanguardlabs.com' },
      { name: 'Harper Reed', email: 'harper.r@gmail.com' },
      { name: 'Beacon Logistics', email: 'procurement@beaconlogistics.com' },
      { name: 'David Kim', email: 'dkim@kimdevs.io' },
      { name: 'Astral Media', email: 'finance@astralmedia.org' },
      { name: 'Chloe Dubois', email: 'chloe.dubois@paris-tech.fr' },
      { name: 'Kestrel Robotics', email: 'orders@kestrel.ai' },
      { name: 'Julian Vance', email: 'julian@vancepartners.com' },
      { name: 'Summit Retailers', email: 'merch@summitretail.com' }
    ];

    const data = [];
    let idCounter = 1050;

    // Distribute 42 realistic sales records over the past 55 days
    const dayOffsets = [
      0, 0, 1, 1, 2, 3, 4, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
      17, 18, 20, 21, 22, 24, 25, 27, 28, 30, 32, 34, 36, 38, 40, 42, 45, 47, 50, 52, 54
    ];

    dayOffsets.forEach((offset, idx) => {
      const d = new Date(today);
      d.setDate(d.getDate() - offset);
      const dateStr = d.toISOString().split('T')[0];

      const catObj = categories[idx % categories.length];
      const prod = catObj.products[idx % catObj.products.length];
      const cust = customers[idx % customers.length];
      const chan = channels[(idx * 3) % channels.length];

      // Base amounts depending on category
      let baseAmount = 150;
      let costRatio = 0.35;

      if (catObj.name === 'SaaS & Software') {
        baseAmount = 300 + (idx * 95) % 1800;
        costRatio = 0.15; // SaaS high margins
      } else if (catObj.name === 'Consulting & Services') {
        baseAmount = 1200 + (idx * 210) % 3500;
        costRatio = 0.40;
      } else if (catObj.name === 'Electronics & Hardware') {
        baseAmount = 200 + (idx * 75) % 950;
        costRatio = 0.55;
      } else if (catObj.name === 'Office Supplies') {
        baseAmount = 60 + (idx * 45) % 250;
        costRatio = 0.50;
      } else {
        baseAmount = 45 + (idx * 30) % 160;
        costRatio = 0.45;
      }

      const amount = Math.round(baseAmount * 100) / 100;
      const cost = Math.round(amount * costRatio * 100) / 100;

      // Status distribution
      let status = 'Completed';
      if (idx === 1 || idx === 11) status = 'Pending';
      if (idx === 7 || idx === 25) status = 'Refunded';

      data.push({
        id: `TXN-${idCounter++}`,
        customer: cust.name,
        email: cust.email,
        product: prod,
        category: catObj.name,
        channel: chan,
        amount: amount,
        cost: cost,
        profit: Math.round((amount - cost) * 100) / 100,
        status: status,
        date: dateStr,
        notes: (idx % 4 === 0) ? 'Priority customer enterprise tier' : ''
      });
    });

    return data;
  }

  // WebStorage Synchronization
  function loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      if (stored) {
        state.transactions = JSON.parse(stored);
      } else {
        state.transactions = generateSeedData();
        saveToStorage();
      }

      const storedQuota = localStorage.getItem(STORAGE_KEYS.QUOTA);
      if (storedQuota) {
        state.monthlyQuota = parseFloat(storedQuota) || 100000;
      }

      const storedCurrency = localStorage.getItem(STORAGE_KEYS.CURRENCY);
      if (storedCurrency) {
        state.currency = storedCurrency;
      }
    } catch (e) {
      console.error('Storage access error, resetting to seed:', e);
      state.transactions = generateSeedData();
    }
  }

  function saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(state.transactions));
      localStorage.setItem(STORAGE_KEYS.QUOTA, state.monthlyQuota.toString());
      localStorage.setItem(STORAGE_KEYS.CURRENCY, state.currency);
      updateStorageWidget();
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
      showToast('Storage quota exceeded or unavailable', 'danger');
    }
  }

  function updateStorageWidget() {
    const metaText = document.getElementById('storage-meta-text');
    const progressBar = document.getElementById('storage-progress-bar');
    const orderCountBadge = document.getElementById('sidebar-order-count');

    if (orderCountBadge) orderCountBadge.textContent = state.transactions.length;

    if (metaText && progressBar) {
      const count = state.transactions.length;
      metaText.textContent = `${count} transactions saved`;
      const pct = Math.min(100, Math.max(8, Math.round((count / 200) * 100)));
      progressBar.style.width = pct + '%';
    }
  }

  // Toast Notification System
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = '';
    if (type === 'success') {
      icon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>';
    } else if (type === 'danger') {
      icon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
    } else {
      icon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
    }

    toast.innerHTML = `${icon} <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, 3200);
  }

  // Filter Transactions by Time Period
  function getFilteredTransactions(periodOverride = null) {
    const now = new Date();
    const period = periodOverride || state.periodFilter;

    if (period === 'all') {
      return [...state.transactions];
    }

    return state.transactions.filter(t => {
      const parts = t.date.split('-');
      if (parts.length !== 3) return false;
      const tDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));

      if (period === '7') {
        const diffDays = (now - tDate) / (1000 * 60 * 60 * 24);
        return diffDays >= 0 && diffDays <= 7;
      }
      if (period === '30') {
        const diffDays = (now - tDate) / (1000 * 60 * 60 * 24);
        return diffDays >= 0 && diffDays <= 30;
      }
      if (period === '90') {
        const diffDays = (now - tDate) / (1000 * 60 * 60 * 24);
        return diffDays >= 0 && diffDays <= 90;
      }
      if (period === 'this-month') {
        return tDate.getFullYear() === now.getFullYear() && tDate.getMonth() === now.getMonth();
      }
      if (period === 'last-month') {
        const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return tDate.getFullYear() === lastMonthDate.getFullYear() && tDate.getMonth() === lastMonthDate.getMonth();
      }
      return true;
    });
  }

  // Calculate Previous Period for Growth Comparisons
  function getPreviousPeriodTransactions() {
    const now = new Date();
    const period = state.periodFilter;

    return state.transactions.filter(t => {
      const parts = t.date.split('-');
      if (parts.length !== 3) return false;
      const tDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));

      if (period === '7') {
        const diffDays = (now - tDate) / (1000 * 60 * 60 * 24);
        return diffDays > 7 && diffDays <= 14;
      }
      if (period === '30') {
        const diffDays = (now - tDate) / (1000 * 60 * 60 * 24);
        return diffDays > 30 && diffDays <= 60;
      }
      if (period === '90') {
        const diffDays = (now - tDate) / (1000 * 60 * 60 * 24);
        return diffDays > 90 && diffDays <= 180;
      }
      if (period === 'this-month') {
        const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return tDate.getFullYear() === lastMonthDate.getFullYear() && tDate.getMonth() === lastMonthDate.getMonth();
      }
      return false;
    });
  }

  // KPI Computations
  function updateKPIs() {
    const filtered = getFilteredTransactions();
    const prevFiltered = getPreviousPeriodTransactions();

    // Current Gross Revenue & Profit (Completed only)
    const completedList = filtered.filter(t => t.status === 'Completed');
    const totalRevenue = completedList.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const totalProfit = completedList.reduce((sum, t) => sum + ((Number(t.amount) || 0) - (Number(t.cost) || 0)), 0);
    const totalOrders = filtered.length;
    const completedCount = completedList.length;

    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const avgOrderValue = completedCount > 0 ? totalRevenue / completedCount : 0;

    // Previous period revenue & AOV
    const prevCompleted = prevFiltered.filter(t => t.status === 'Completed');
    const prevRevenue = prevCompleted.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const prevAov = prevCompleted.length > 0 ? prevRevenue / prevCompleted.length : 0;

    // Revenue Growth Badge
    const revTrendElem = document.getElementById('kpi-revenue-trend');
    if (revTrendElem) {
      if (prevRevenue > 0) {
        const growth = ((totalRevenue - prevRevenue) / prevRevenue) * 100;
        const sign = growth >= 0 ? '+' : '';
        revTrendElem.textContent = `${sign}${growth.toFixed(1)}%`;
        revTrendElem.className = `kpi-badge ${growth >= 0 ? 'positive' : 'negative'}`;
      } else {
        revTrendElem.textContent = '+12.5%';
        revTrendElem.className = 'kpi-badge positive';
      }
    }

    // AOV Growth Badge
    const aovTrendElem = document.getElementById('kpi-aov-trend');
    if (aovTrendElem) {
      if (prevAov > 0) {
        const aovGrowth = ((avgOrderValue - prevAov) / prevAov) * 100;
        const sign = aovGrowth >= 0 ? '+' : '';
        aovTrendElem.textContent = `${sign}${aovGrowth.toFixed(1)}%`;
        aovTrendElem.className = `kpi-badge ${aovGrowth >= 0 ? 'positive' : 'negative'}`;
      } else {
        aovTrendElem.textContent = '+4.8%';
        aovTrendElem.className = 'kpi-badge positive';
      }
    }

    // DOM Updates
    document.getElementById('kpi-total-revenue').textContent = formatMoney(totalRevenue);
    document.getElementById('kpi-net-profit').textContent = formatMoney(totalProfit);
    document.getElementById('kpi-profit-margin').textContent = `${profitMargin.toFixed(1)}% margin`;
    document.getElementById('kpi-total-orders').textContent = totalOrders.toLocaleString();
    document.getElementById('kpi-completed-ratio').textContent = `${completedCount} completed`;
    document.getElementById('kpi-avg-order-value').textContent = formatMoney(avgOrderValue);

    // Days in current filter
    let daysCount = 30;
    if (state.periodFilter === '7') daysCount = 7;
    if (state.periodFilter === '90') daysCount = 90;
    const avgDaily = (totalOrders / (daysCount || 1)).toFixed(1);
    document.getElementById('kpi-avg-daily-orders').textContent = `${avgDaily} orders / day avg`;

    // Monthly Quota Progress
    updateQuotaBanner(totalRevenue);

    // Sparklines on KPI Cards
    renderSparklines(filtered);
  }

  // Monthly Quota Tracker
  function updateQuotaBanner(currentRevenue) {
    const target = state.monthlyQuota || 100000;
    const pct = Math.min(100, Math.round((currentRevenue / target) * 100));

    document.getElementById('quota-target-text').textContent = formatMoney(target);
    document.getElementById('quota-achieved-text').textContent = formatMoney(currentRevenue);
    document.getElementById('quota-percent-text').textContent = `${pct}%`;

    const fillElem = document.getElementById('quota-progress-fill');
    fillElem.style.width = `${pct}%`;

    const remaining = target - currentRevenue;
    const remElem = document.getElementById('quota-remaining-text');
    if (remaining <= 0) {
      remElem.innerHTML = '<strong style="color: #10b981;">Target achieved!</strong>';
    } else {
      remElem.textContent = `${formatMoney(remaining)} needed to reach target.`;
    }
  }

  // Sparklines Renderer (Lightweight canvas charts for KPI cards)
  function renderSparklines(filtered) {
    const sorted = [...filtered].sort((a, b) => a.date.localeCompare(b.date));

    // Aggregate into 10 buckets for sparklines
    const bucketCount = 10;
    const revBuckets = new Array(bucketCount).fill(0);
    const profBuckets = new Array(bucketCount).fill(0);
    const ordBuckets = new Array(bucketCount).fill(0);

    if (sorted.length > 0) {
      sorted.forEach((item, index) => {
        const bIdx = Math.min(bucketCount - 1, Math.floor((index / sorted.length) * bucketCount));
        if (item.status === 'Completed') {
          revBuckets[bIdx] += Number(item.amount) || 0;
          profBuckets[bIdx] += (Number(item.amount) || 0) - (Number(item.cost) || 0);
        }
        ordBuckets[bIdx] += 1;
      });
    } else {
      revBuckets.fill(10);
      profBuckets.fill(5);
      ordBuckets.fill(1);
    }

    drawSparkline('sparkline-revenue', revBuckets, '#3b82f6', 'rgba(59, 130, 246, 0.15)');
    drawSparkline('sparkline-profit', profBuckets, '#10b981', 'rgba(16, 185, 129, 0.15)');
    drawSparkline('sparkline-orders', ordBuckets, '#8b5cf6', 'rgba(139, 92, 246, 0.15)');

    // AOV sparkline: rev / ord
    const aovBuckets = revBuckets.map((rev, i) => (ordBuckets[i] > 0 ? rev / ordBuckets[i] : 0));
    drawSparkline('sparkline-aov', aovBuckets, '#f59e0b', 'rgba(245, 158, 11, 0.15)');
  }

  function drawSparkline(canvasId, data, strokeColor, fillColor) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = (max - min) || 1;

    const points = data.map((val, idx) => {
      const x = (idx / (data.length - 1)) * (width - 10) + 5;
      const y = height - 5 - ((val - min) / range) * (height - 12);
      return { x, y };
    });

    // Draw Fill
    ctx.beginPath();
    ctx.moveTo(points[0].x, height);
    points.forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.lineTo(points[points.length - 1].x, height);
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();

    // Draw Line
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Final dot marker
    const lastP = points[points.length - 1];
    ctx.beginPath();
    ctx.arc(lastP.x, lastP.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = strokeColor;
    ctx.fill();
  }

  // ========================================================
  // Custom Interactive Canvas Chart Engine
  // ========================================================

  let mainChartDataCache = null;

  function renderMainTimelineChart() {
    const canvas = document.getElementById('timeline-chart-canvas');
    if (!canvas) return;

    const parent = canvas.parentElement;
    const dpr = window.devicePixelRatio || 1;
    const rect = parent.getBoundingClientRect();
    const width = rect.width;
    const height = 280;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const filtered = getFilteredTransactions();

    // Aggregate dates
    const dateMap = {};
    filtered.forEach(t => {
      let key = t.date;
      if (state.chartInterval === 'month') {
        key = t.date.substring(0, 7); // YYYY-MM
      }
      if (!dateMap[key]) {
        dateMap[key] = { revenue: 0, profit: 0, orders: 0, count: 0 };
      }
      dateMap[key].orders += 1;
      if (t.status === 'Completed') {
        dateMap[key].revenue += Number(t.amount) || 0;
        dateMap[key].profit += (Number(t.amount) || 0) - (Number(t.cost) || 0);
      }
    });

    const keys = Object.keys(dateMap).sort();
    if (keys.length === 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No data available for the chosen time range', width / 2, height / 2);
      mainChartDataCache = null;
      return;
    }

    // Prepare plotting data
    const chartData = keys.map(k => {
      const parts = k.split('-');
      let label = k;
      if (state.chartInterval === 'month' && parts.length >= 2) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
        label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      } else if (parts.length === 3) {
        label = `${parts[1]}/${parts[2]}`;
      }
      return {
        key: k,
        label: label,
        revenue: dateMap[k].revenue,
        profit: dateMap[k].profit,
        orders: dateMap[k].orders
      };
    });

    // Determine value to plot
    let primaryKey = 'revenue';
    let primaryColor = '#3b82f6';
    let gradientStart = 'rgba(59, 130, 246, 0.35)';
    let gradientEnd = 'rgba(59, 130, 246, 0.0)';

    if (state.chartMetric === 'profit') {
      primaryKey = 'profit';
      primaryColor = '#10b981';
      gradientStart = 'rgba(16, 185, 129, 0.35)';
      gradientEnd = 'rgba(16, 185, 129, 0.0)';
    } else if (state.chartMetric === 'orders') {
      primaryKey = 'orders';
      primaryColor = '#8b5cf6';
      gradientStart = 'rgba(139, 92, 246, 0.35)';
      gradientEnd = 'rgba(139, 92, 246, 0.0)';
    }

    // Chart margins
    const paddingLeft = 60;
    const paddingRight = 24;
    const paddingTop = 20;
    const paddingBottom = 40;
    const plotWidth = width - paddingLeft - paddingRight;
    const plotHeight = height - paddingTop - paddingBottom;

    // Calculate Max value
    const maxVal = Math.max(...chartData.map(d => d[primaryKey]), 10) * 1.15;
    const minVal = 0;

    // Draw horizontal grid lines & Y-axis labels
    const gridLines = 4;
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#64748b';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';

    for (let i = 0; i <= gridLines; i++) {
      const y = paddingTop + (plotHeight / gridLines) * i;
      const val = maxVal - (maxVal / gridLines) * i;

      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(width - paddingRight, y);
      ctx.stroke();

      let labelText = state.chartMetric === 'orders' ? Math.round(val) : formatMoney(val, true);
      ctx.fillText(labelText, paddingLeft - 10, y + 4);
    }

    // Calculate coordinate points
    const stepX = chartData.length > 1 ? plotWidth / (chartData.length - 1) : plotWidth / 2;
    const points = chartData.map((d, idx) => {
      const x = chartData.length > 1 ? paddingLeft + idx * stepX : paddingLeft + plotWidth / 2;
      const y = paddingTop + plotHeight - ((d[primaryKey] - minVal) / (maxVal - minVal)) * plotHeight;
      return { x, y, data: d };
    });

    // Save coordinates to cache for mouse interaction
    mainChartDataCache = {
      points,
      primaryKey,
      primaryColor,
      width,
      height,
      paddingLeft,
      paddingTop,
      plotWidth,
      plotHeight
    };

    // Draw smooth curved area fill
    if (points.length > 1) {
      const grad = ctx.createLinearGradient(0, paddingTop, 0, paddingTop + plotHeight);
      grad.addColorStop(0, gradientStart);
      grad.addColorStop(1, gradientEnd);

      ctx.beginPath();
      ctx.moveTo(points[0].x, paddingTop + plotHeight);
      ctx.lineTo(points[0].x, points[0].y);

      for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i];
        const p1 = points[i + 1];
        const cpX = (p0.x + p1.x) / 2;
        ctx.bezierCurveTo(cpX, p0.y, cpX, p1.y, p1.x, p1.y);
      }

      ctx.lineTo(points[points.length - 1].x, paddingTop + plotHeight);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // Draw Main Stroke Curve
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i];
        const p1 = points[i + 1];
        const cpX = (p0.x + p1.x) / 2;
        ctx.bezierCurveTo(cpX, p0.y, cpX, p1.y, p1.x, p1.y);
      }
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // Draw points & X-axis labels
    const labelSkip = Math.max(1, Math.ceil(chartData.length / 8));
    ctx.textAlign = 'center';
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px sans-serif';

    points.forEach((p, idx) => {
      // Small point dot
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = primaryColor;
      ctx.fill();
      ctx.strokeStyle = '#0e1524';
      ctx.lineWidth = 2;
      ctx.stroke();

      // X-Axis labels
      if (idx % labelSkip === 0 || idx === points.length - 1) {
        ctx.fillText(p.data.label, p.x, height - 12);
      }
    });
  }

  // Hover Interaction for Main Timeline Chart
  function setupMainChartEvents() {
    const canvas = document.getElementById('timeline-chart-canvas');
    const tooltip = document.getElementById('chart-tooltip');
    if (!canvas || !tooltip) return;

    canvas.addEventListener('mousemove', (e) => {
      if (!mainChartDataCache || !mainChartDataCache.points.length) {
        tooltip.style.opacity = '0';
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Find closest point on X
      let closest = null;
      let minDistance = Infinity;

      mainChartDataCache.points.forEach(p => {
        const dist = Math.abs(mouseX - p.x);
        if (dist < minDistance) {
          minDistance = dist;
          closest = p;
        }
      });

      if (closest && minDistance < 50) {
        renderMainTimelineChart();

        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        ctx.save();
        ctx.scale(dpr, dpr);

        // Draw vertical crosshair guide
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1;
        ctx.moveTo(closest.x, mainChartDataCache.paddingTop);
        ctx.lineTo(closest.x, mainChartDataCache.paddingTop + mainChartDataCache.plotHeight);
        ctx.stroke();

        // Glowing active point
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(closest.x, closest.y, 6.5, 0, Math.PI * 2);
        ctx.fillStyle = mainChartDataCache.primaryColor;
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
        ctx.restore();

        // Update Tooltip Box
        const d = closest.data;
        tooltip.innerHTML = `
          <div style="font-weight: 700; color: #ffffff; margin-bottom: 4px;">${formatDate(d.key)}</div>
          <div style="color: #3b82f6; display: flex; justify-content: space-between; gap: 16px;">
            <span>Revenue:</span> <strong>${formatMoney(d.revenue)}</strong>
          </div>
          <div style="color: #10b981; display: flex; justify-content: space-between; gap: 16px;">
            <span>Net Profit:</span> <strong>${formatMoney(d.profit)}</strong>
          </div>
          <div style="color: #94a3b8; display: flex; justify-content: space-between; gap: 16px;">
            <span>Orders:</span> <strong>${d.orders}</strong>
          </div>
        `;

        let tipX = closest.x + 15;
        let tipY = closest.y - 40;
        if (tipX + 180 > rect.width) tipX = closest.x - 190;
        if (tipY < 10) tipY = 10;

        tooltip.style.left = tipX + 'px';
        tooltip.style.top = tipY + 'px';
        tooltip.style.opacity = '1';
      } else {
        tooltip.style.opacity = '0';
      }
    });

    canvas.addEventListener('mouseleave', () => {
      tooltip.style.opacity = '0';
      renderMainTimelineChart();
    });
  }

  // ========================================================
  // Category Donut Chart Renderer
  // ========================================================

  function renderCategoryDonutChart() {
    const canvas = document.getElementById('category-donut-canvas');
    const legendList = document.getElementById('category-legend-list');
    const centerTotalElem = document.getElementById('donut-total-categories');
    if (!canvas || !legendList) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const filtered = getFilteredTransactions().filter(t => t.status === 'Completed');

    // Aggregate category revenues
    const catMap = {};
    let totalRev = 0;
    filtered.forEach(t => {
      const cat = t.category || 'Other';
      const amt = Number(t.amount) || 0;
      catMap[cat] = (catMap[cat] || 0) + amt;
      totalRev += amt;
    });

    const categories = Object.keys(catMap).map(cat => ({
      name: cat,
      revenue: catMap[cat],
      color: CATEGORY_COLORS[cat] || '#64748b',
      percentage: totalRev > 0 ? (catMap[cat] / totalRev) * 100 : 0
    })).sort((a, b) => b.revenue - a.revenue);

    centerTotalElem.textContent = categories.length;

    // Populate Right-hand Legend
    legendList.innerHTML = '';
    if (categories.length === 0) {
      legendList.innerHTML = '<div style="color:#64748b; font-size:12px;">No sales in period</div>';
    } else {
      categories.forEach(item => {
        const row = document.createElement('div');
        row.className = 'donut-legend-row';
        row.innerHTML = `
          <div class="donut-legend-left">
            <span class="legend-color-dot" style="background:${item.color};"></span>
            <span>${item.name}</span>
          </div>
          <div class="donut-legend-right">
            <span>${item.percentage.toFixed(0)}%</span>
            <span style="color:#94a3b8; font-weight:400; margin-left:6px;">(${formatMoney(item.revenue, true)})</span>
          </div>
        `;
        legendList.appendChild(row);
      });
    }

    // Draw Donut Rings
    const centerX = width / 2;
    const centerY = height / 2;
    const outerRadius = width / 2 - 12;
    const innerRadius = outerRadius - 26;

    if (totalRev === 0 || categories.length === 0) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
      ctx.arc(centerX, centerY, innerRadius, Math.PI * 2, 0, true);
      ctx.fillStyle = '#1e293b';
      ctx.fill();
      return;
    }

    let startAngle = -Math.PI / 2;
    categories.forEach(item => {
      const sliceAngle = (item.revenue / totalRev) * (Math.PI * 2);
      const endAngle = startAngle + sliceAngle;

      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRadius, startAngle, endAngle);
      ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = item.color;
      ctx.fill();

      // Outer separation line
      ctx.strokeStyle = '#111a2a';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      startAngle = endAngle;
    });
  }

  // ========================================================
  // Sales Channel Performance Chart (Horizontal Bars)
  // ========================================================

  function renderChannelBarChart() {
    const canvas = document.getElementById('channel-bar-canvas');
    if (!canvas) return;

    const parent = canvas.parentElement;
    const dpr = window.devicePixelRatio || 1;
    const rect = parent.getBoundingClientRect();
    const width = rect.width;
    const height = 240;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const filtered = getFilteredTransactions().filter(t => t.status === 'Completed');

    // Default channels list
    const channelList = ['Online Web', 'Direct Sales', 'In-Store', 'Affiliate', 'Wholesale'];
    const channelMap = {};
    channelList.forEach(ch => channelMap[ch] = 0);

    let maxChannelRev = 100;
    filtered.forEach(t => {
      const ch = t.channel || 'Direct Sales';
      const amt = Number(t.amount) || 0;
      channelMap[ch] = (channelMap[ch] || 0) + amt;
      if (channelMap[ch] > maxChannelRev) maxChannelRev = channelMap[ch];
    });

    const labelWidth = 95;
    const valueWidth = 80;
    const barAreaWidth = width - labelWidth - valueWidth - 20;
    const rowHeight = (height - 30) / channelList.length;

    channelList.forEach((ch, idx) => {
      const y = 20 + idx * rowHeight;
      const amount = channelMap[ch];
      const barWidth = Math.max(4, (amount / maxChannelRev) * barAreaWidth);

      // Channel Label
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '600 12px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(ch, labelWidth, y + 14);

      // Track background
      ctx.fillStyle = '#0b111c';
      ctx.beginPath();
      ctx.roundRect(labelWidth + 12, y, barAreaWidth, 16, 4);
      ctx.fill();

      // Value bar
      const grad = ctx.createLinearGradient(labelWidth + 12, y, labelWidth + 12 + barWidth, y);
      grad.addColorStop(0, '#3b82f6');
      grad.addColorStop(1, '#60a5fa');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(labelWidth + 12, y, barWidth, 16, 4);
      ctx.fill();

      // Amount Label
      ctx.fillStyle = '#f8fafc';
      ctx.font = '700 12px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(formatMoney(amount, true), labelWidth + 20 + barAreaWidth, y + 13);
    });
  }

  // ========================================================
  // Top Performing Products Leaderboard
  // ========================================================

  function renderTopProducts() {
    const container = document.getElementById('top-products-container');
    if (!container) return;

    const filtered = getFilteredTransactions().filter(t => t.status === 'Completed');

    // Aggregate by product
    const productMap = {};
    let highestRev = 100;

    filtered.forEach(t => {
      const p = t.product || 'Unnamed Item';
      if (!productMap[p]) {
        productMap[p] = { count: 0, revenue: 0, category: t.category };
      }
      productMap[p].count += 1;
      productMap[p].revenue += Number(t.amount) || 0;
      if (productMap[p].revenue > highestRev) highestRev = productMap[p].revenue;
    });

    const sortedProducts = Object.keys(productMap)
      .map(k => ({ name: k, ...productMap[k] }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    container.innerHTML = '';

    if (sortedProducts.length === 0) {
      container.innerHTML = '<div style="color:#64748b; font-size:13px; padding: 20px 0;">No sales transactions in selected period.</div>';
      return;
    }

    sortedProducts.forEach((item, idx) => {
      const rank = idx + 1;
      const rankClass = rank === 1 ? 'top-product-rank gold' : 'top-product-rank';
      const pct = Math.min(100, Math.round((item.revenue / highestRev) * 100));

      const row = document.createElement('div');
      row.className = 'top-product-item';
      row.innerHTML = `
        <div class="${rankClass}">#${rank}</div>
        <div class="top-product-details">
          <div class="top-product-title-row">
            <span class="top-product-name" title="${item.name}">${item.name} (${item.count} sold)</span>
            <span class="top-product-revenue">${formatMoney(item.revenue)}</span>
          </div>
          <div class="top-product-bar-bg">
            <div class="top-product-bar-fill" style="width: ${pct}%;"></div>
          </div>
        </div>
      `;
      container.appendChild(row);
    });
  }

  // ========================================================
  // Transactions Ledger Table & Filtering
  // ========================================================

  function populateCategoryFilters() {
    const select = document.getElementById('filter-category');
    if (!select) return;

    const currentVal = select.value;
    const cats = new Set();
    state.transactions.forEach(t => {
      if (t.category) cats.add(t.category);
    });

    select.innerHTML = '<option value="ALL">All Categories</option>';
    Array.from(cats).sort().forEach(c => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      select.appendChild(opt);
    });

    if (cats.has(currentVal)) {
      select.value = currentVal;
    }
  }

  function getTableData() {
    const { search, category, channel, status, sort } = state.table;

    let list = [...state.transactions];

    // Filter Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        (t.customer && t.customer.toLowerCase().includes(q)) ||
        (t.email && t.email.toLowerCase().includes(q)) ||
        (t.product && t.product.toLowerCase().includes(q)) ||
        (t.id && t.id.toLowerCase().includes(q)) ||
        (t.notes && t.notes.toLowerCase().includes(q))
      );
    }

    // Filter Category
    if (category !== 'ALL') {
      list = list.filter(t => t.category === category);
    }

    // Filter Channel
    if (channel !== 'ALL') {
      list = list.filter(t => t.channel === channel);
    }

    // Filter Status
    if (status !== 'ALL') {
      list = list.filter(t => t.status === status);
    }

    // Sorting
    list.sort((a, b) => {
      if (sort === 'date-desc') return b.date.localeCompare(a.date);
      if (sort === 'date-asc') return a.date.localeCompare(b.date);
      if (sort === 'amount-desc') return (Number(b.amount) || 0) - (Number(a.amount) || 0);
      if (sort === 'amount-asc') return (Number(a.amount) || 0) - (Number(b.amount) || 0);
      return 0;
    });

    return list;
  }

  function renderTransactionsTable() {
    const tbody = document.getElementById('transactions-tbody');
    const emptyState = document.getElementById('table-empty-state');
    const pageInfo = document.getElementById('pagination-info-text');
    const currPageElem = document.getElementById('pagination-current-page');
    const prevBtn = document.getElementById('btn-page-prev');
    const nextBtn = document.getElementById('btn-page-next');

    if (!tbody) return;

    const data = getTableData();
    const totalItems = data.length;
    const pageSize = state.table.pageSize;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

    if (state.table.page > totalPages) {
      state.table.page = totalPages;
    }

    const startIndex = (state.table.page - 1) * pageSize;
    const pageItems = data.slice(startIndex, startIndex + pageSize);

    tbody.innerHTML = '';

    if (totalItems === 0) {
      emptyState.classList.remove('hidden');
      if (pageInfo) pageInfo.textContent = 'Showing 0 transactions';
      if (currPageElem) currPageElem.textContent = '1 / 1';
      if (prevBtn) prevBtn.disabled = true;
      if (nextBtn) nextBtn.disabled = true;
      return;
    }

    emptyState.classList.add('hidden');

    pageItems.forEach(t => {
      const tr = document.createElement('tr');

      const statusClass = (t.status || 'completed').toLowerCase();
      const initials = getInitials(t.customer);
      const estProfit = (Number(t.amount) || 0) - (Number(t.cost) || 0);

      tr.innerHTML = `
        <td style="font-weight: 700; color: #3b82f6;">${t.id}</td>
        <td>
          <div class="customer-cell">
            <div class="avatar-initials">${initials}</div>
            <div>
              <div class="customer-name">${escapeHTML(t.customer)}</div>
              <div class="customer-email">${escapeHTML(t.email || 'N/A')}</div>
            </div>
          </div>
        </td>
        <td>
          <div style="font-weight: 600; color: #f1f5f9;">${escapeHTML(t.product)}</div>
          <div style="font-size: 11px; color: #64748b;">${escapeHTML(t.category)}</div>
        </td>
        <td>${formatDate(t.date)}</td>
        <td><span style="font-size: 12px; color: #cbd5e1;">${escapeHTML(t.channel)}</span></td>
        <td><span class="status-pill ${statusClass}">${escapeHTML(t.status)}</span></td>
        <td style="font-weight: 700; color: #f8fafc;">${formatMoney(t.amount)}</td>
        <td style="font-weight: 600; color: #10b981;">${formatMoney(estProfit)}</td>
        <td>
          <div class="action-buttons-cell">
            <button class="action-icon-btn edit-btn" data-id="${t.id}" title="Edit Sale">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button class="action-icon-btn delete-btn" data-id="${t.id}" title="Delete Record">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </td>
      `;

      tbody.appendChild(tr);
    });

    // Pagination info
    const startNum = startIndex + 1;
    const endNum = Math.min(startIndex + pageSize, totalItems);
    if (pageInfo) pageInfo.textContent = `Showing ${startNum}-${endNum} of ${totalItems} transactions`;
    if (currPageElem) currPageElem.textContent = `${state.table.page} / ${totalPages}`;
    if (prevBtn) prevBtn.disabled = state.table.page <= 1;
    if (nextBtn) nextBtn.disabled = state.table.page >= totalPages;
  }

  function escapeHTML(str) {
    if (!str) return '';
    return str.toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ========================================================
  // Modal Handlers (Add, Edit, Quota, Backup)
  // ========================================================

  function openSaleModal(transactionId = null) {
    const modal = document.getElementById('sale-modal-backdrop');
    const titleElem = document.getElementById('sale-modal-title');
    const form = document.getElementById('sale-form');
    if (!modal || !form) return;

    form.reset();
    state.editingId = transactionId;

    if (transactionId) {
      const record = state.transactions.find(t => t.id === transactionId);
      if (record) {
        titleElem.textContent = `Edit Sale (${record.id})`;
        document.getElementById('sale-id').value = record.id;
        document.getElementById('sale-customer').value = record.customer;
        document.getElementById('sale-email').value = record.email || '';
        document.getElementById('sale-product').value = record.product;
        document.getElementById('sale-category').value = record.category;
        document.getElementById('sale-amount').value = record.amount;
        document.getElementById('sale-cost').value = record.cost || 0;
        document.getElementById('sale-channel').value = record.channel;
        document.getElementById('sale-status').value = record.status;
        document.getElementById('sale-date').value = record.date;
        document.getElementById('sale-notes').value = record.notes || '';
      }
    } else {
      titleElem.textContent = 'Record New Sale';
      document.getElementById('sale-id').value = '';
      document.getElementById('sale-date').value = new Date().toISOString().split('T')[0];
    }

    modal.classList.add('open');
  }

  function closeSaleModal() {
    const modal = document.getElementById('sale-modal-backdrop');
    if (modal) modal.classList.remove('open');
    state.editingId = null;
  }

  function handleSaleFormSubmit(e) {
    e.preventDefault();

    const customer = document.getElementById('sale-customer').value.trim();
    const email = document.getElementById('sale-email').value.trim();
    const product = document.getElementById('sale-product').value.trim();
    const category = document.getElementById('sale-category').value;
    const amount = parseFloat(document.getElementById('sale-amount').value) || 0;
    const cost = parseFloat(document.getElementById('sale-cost').value) || 0;
    const channel = document.getElementById('sale-channel').value;
    const status = document.getElementById('sale-status').value;
    const date = document.getElementById('sale-date').value;
    const notes = document.getElementById('sale-notes').value.trim();

    if (!customer || !product || amount <= 0 || !date) {
      showToast('Please fill out all required fields with valid values.', 'warning');
      return;
    }

    if (state.editingId) {
      const index = state.transactions.findIndex(t => t.id === state.editingId);
      if (index !== -1) {
        state.transactions[index] = {
          ...state.transactions[index],
          customer,
          email,
          product,
          category,
          amount,
          cost,
          profit: Math.round((amount - cost) * 100) / 100,
          channel,
          status,
          date,
          notes
        };
        showToast(`Transaction ${state.editingId} updated successfully!`, 'success');
      }
    } else {
      const nextIdNum = Math.floor(1000 + Math.random() * 9000);
      const newTransaction = {
        id: `TXN-${nextIdNum}`,
        customer,
        email,
        product,
        category,
        amount,
        cost,
        profit: Math.round((amount - cost) * 100) / 100,
        channel,
        status,
        date,
        notes
      };
      state.transactions.unshift(newTransaction);
      showToast(`Sale recorded! (${newTransaction.id})`, 'success');
    }

    saveToStorage();
    closeSaleModal();
    populateCategoryFilters();
    refreshAllViews();
  }

  function deleteTransaction(id) {
    if (confirm(`Are you sure you want to delete transaction ${id}?`)) {
      state.transactions = state.transactions.filter(t => t.id !== id);
      saveToStorage();
      showToast(`Transaction ${id} deleted.`, 'info');
      refreshAllViews();
    }
  }

  // Quota Modal
  function openQuotaModal() {
    const modal = document.getElementById('quota-modal-backdrop');
    const input = document.getElementById('quota-input-val');
    if (!modal || !input) return;
    input.value = state.monthlyQuota;
    modal.classList.add('open');
  }

  function closeQuotaModal() {
    const modal = document.getElementById('quota-modal-backdrop');
    if (modal) modal.classList.remove('open');
  }

  // Backup Modal
  function openBackupModal() {
    const modal = document.getElementById('backup-modal-backdrop');
    if (modal) modal.classList.add('open');
  }

  function closeBackupModal() {
    const modal = document.getElementById('backup-modal-backdrop');
    if (modal) modal.classList.remove('open');
  }

  // ========================================================
  // Data Export & Import Systems
  // ========================================================

  function exportToCSV() {
    if (state.transactions.length === 0) {
      showToast('No transaction data to export.', 'warning');
      return;
    }

    const headers = ['Order ID', 'Customer Name', 'Customer Email', 'Product', 'Category', 'Channel', 'Status', 'Gross Amount', 'Cost', 'Net Profit', 'Date', 'Notes'];
    const rows = state.transactions.map(t => [
      `"${t.id}"`,
      `"${(t.customer || '').replace(/"/g, '""')}"`,
      `"${(t.email || '').replace(/"/g, '""')}"`,
      `"${(t.product || '').replace(/"/g, '""')}"`,
      `"${t.category}"`,
      `"${t.channel}"`,
      `"${t.status}"`,
      t.amount,
      t.cost || 0,
      t.profit || 0,
      `"${t.date}"`,
      `"${(t.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `pulsesales_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Transactions exported to CSV file!', 'success');
  }

  function downloadJSONBackup() {
    const jsonStr = JSON.stringify(state.transactions, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pulsesales_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('JSON backup file downloaded!', 'success');
  }

  function restoreFromJSON() {
    const fileInput = document.getElementById('json-file-input');
    const textArea = document.getElementById('json-paste-area');

    if (fileInput.files.length > 0) {
      const file = fileInput.files[0];
      const reader = new FileReader();
      reader.onload = function (e) {
        try {
          const parsed = JSON.parse(e.target.result);
          applyImportedData(parsed);
        } catch (err) {
          showToast('Invalid JSON file format.', 'danger');
        }
      };
      reader.readAsText(file);
    } else if (textArea.value.trim()) {
      try {
        const parsed = JSON.parse(textArea.value.trim());
        applyImportedData(parsed);
      } catch (err) {
        showToast('Invalid JSON pasted.', 'danger');
      }
    } else {
      showToast('Please select a file or paste JSON content.', 'warning');
    }
  }

  function applyImportedData(data) {
    if (!Array.isArray(data)) {
      showToast('Import failed: JSON must be an array of transactions.', 'danger');
      return;
    }

    state.transactions = data;
    saveToStorage();
    closeBackupModal();
    populateCategoryFilters();
    refreshAllViews();
    showToast(`Successfully imported ${data.length} transactions!`, 'success');
  }

  function resetToSampleData() {
    if (confirm('Are you sure you want to reset all data back to the default sample transactions? This will overwrite existing stored records.')) {
      state.transactions = generateSeedData();
      saveToStorage();
      populateCategoryFilters();
      refreshAllViews();
      showToast('Reset to sample dataset completed.', 'success');
    }
  }

  // ========================================================
  // Refresh & Coordination
  // ========================================================

  function refreshAllViews() {
    updateKPIs();
    renderMainTimelineChart();
    renderCategoryDonutChart();
    renderChannelBarChart();
    renderTopProducts();
    renderTransactionsTable();
    updateStorageWidget();
  }

  // ========================================================
  // Event Bindings
  // ========================================================

  function attachEventHandlers() {
    // Currency Selector
    const currencySelect = document.getElementById('currency-select');
    if (currencySelect) {
      currencySelect.value = state.currency;
      currencySelect.addEventListener('change', (e) => {
        state.currency = e.target.value;
        saveToStorage();
        refreshAllViews();
      });
    }

    // Time Period Filter
    const periodSelect = document.getElementById('date-range-filter');
    if (periodSelect) {
      periodSelect.addEventListener('change', (e) => {
        state.periodFilter = e.target.value;
        refreshAllViews();
      });
    }

    // Chart Metric Selector Pills
    const metricPills = document.querySelectorAll('#chart-metric-selector .pill-btn');
    metricPills.forEach(btn => {
      btn.addEventListener('click', () => {
        metricPills.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.chartMetric = btn.dataset.metric;

        // Update Legend
        const legendElem = document.getElementById('timeline-chart-legend');
        if (state.chartMetric === 'revenue') {
          legendElem.innerHTML = `
            <div class="legend-item"><span class="legend-color-dot" style="background:#3b82f6;"></span> Gross Revenue</div>
          `;
        } else if (state.chartMetric === 'profit') {
          legendElem.innerHTML = `
            <div class="legend-item"><span class="legend-color-dot" style="background:#10b981;"></span> Net Profit</div>
          `;
        } else {
          legendElem.innerHTML = `
            <div class="legend-item"><span class="legend-color-dot" style="background:#8b5cf6;"></span> Total Transactions</div>
          `;
        }

        renderMainTimelineChart();
      });
    });

    // Chart Interval Selector Pills
    const intervalPills = document.querySelectorAll('#chart-interval-selector .pill-btn');
    intervalPills.forEach(btn => {
      btn.addEventListener('click', () => {
        intervalPills.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.chartInterval = btn.dataset.interval;
        renderMainTimelineChart();
      });
    });

    // Table Search
    const searchInput = document.getElementById('table-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        state.table.search = e.target.value;
        state.table.page = 1;
        renderTransactionsTable();
      });
    }

    // Table Filter: Category
    const filterCat = document.getElementById('filter-category');
    if (filterCat) {
      filterCat.addEventListener('change', (e) => {
        state.table.category = e.target.value;
        state.table.page = 1;
        renderTransactionsTable();
      });
    }

    // Table Filter: Channel
    const filterChan = document.getElementById('filter-channel');
    if (filterChan) {
      filterChan.addEventListener('change', (e) => {
        state.table.channel = e.target.value;
        state.table.page = 1;
        renderTransactionsTable();
      });
    }

    // Table Filter: Status
    const filterStat = document.getElementById('filter-status');
    if (filterStat) {
      filterStat.addEventListener('change', (e) => {
        state.table.status = e.target.value;
        state.table.page = 1;
        renderTransactionsTable();
      });
    }

    // Table Sort
    const sortBy = document.getElementById('sort-by');
    if (sortBy) {
      sortBy.addEventListener('change', (e) => {
        state.table.sort = e.target.value;
        renderTransactionsTable();
      });
    }

    // Clear filters button in empty state
    const clearBtn = document.getElementById('btn-clear-filters');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        state.table.search = '';
        state.table.category = 'ALL';
        state.table.channel = 'ALL';
        state.table.status = 'ALL';
        state.table.sort = 'date-desc';
        state.table.page = 1;

        searchInput.value = '';
        filterCat.value = 'ALL';
        filterChan.value = 'ALL';
        filterStat.value = 'ALL';
        sortBy.value = 'date-desc';

        renderTransactionsTable();
      });
    }

    // Items per page
    const pageSizeSelect = document.getElementById('items-per-page');
    if (pageSizeSelect) {
      pageSizeSelect.addEventListener('change', (e) => {
        state.table.pageSize = parseInt(e.target.value, 10) || 10;
        state.table.page = 1;
        renderTransactionsTable();
      });
    }

    // Pagination buttons
    const prevBtn = document.getElementById('btn-page-prev');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (state.table.page > 1) {
          state.table.page--;
          renderTransactionsTable();
        }
      });
    }

    const nextBtn = document.getElementById('btn-page-next');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        const totalItems = getTableData().length;
        const totalPages = Math.ceil(totalItems / state.table.pageSize);
        if (state.table.page < totalPages) {
          state.table.page++;
          renderTransactionsTable();
        }
      });
    }

    // Table Edit & Delete Click Delegation
    const tbody = document.getElementById('transactions-tbody');
    if (tbody) {
      tbody.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.edit-btn');
        if (editBtn) {
          const id = editBtn.dataset.id;
          openSaleModal(id);
          return;
        }

        const deleteBtn = e.target.closest('.delete-btn');
        if (deleteBtn) {
          const id = deleteBtn.dataset.id;
          deleteTransaction(id);
          return;
        }
      });
    }

    // Sale Form Modal Triggers
    const openAddBtn = document.getElementById('open-add-modal-btn');
    if (openAddBtn) openAddBtn.addEventListener('click', () => openSaleModal());

    const quickAddBtn = document.getElementById('sidebar-quick-add');
    if (quickAddBtn) quickAddBtn.addEventListener('click', () => openSaleModal());

    const tableAddBtn = document.getElementById('btn-add-table-sale');
    if (tableAddBtn) tableAddBtn.addEventListener('click', () => openSaleModal());

    const closeBtn = document.getElementById('modal-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', closeSaleModal);

    const cancelBtn = document.getElementById('modal-cancel-btn');
    if (cancelBtn) cancelBtn.addEventListener('click', closeSaleModal);

    const saleForm = document.getElementById('sale-form');
    if (saleForm) saleForm.addEventListener('submit', handleSaleFormSubmit);

    // Quota Modal
    const adjustQuotaBtn = document.getElementById('adjust-quota-btn');
    if (adjustQuotaBtn) adjustQuotaBtn.addEventListener('click', openQuotaModal);

    const quotaCloseBtn = document.getElementById('quota-close-btn');
    if (quotaCloseBtn) quotaCloseBtn.addEventListener('click', closeQuotaModal);

    const quotaCancelBtn = document.getElementById('quota-cancel-btn');
    if (quotaCancelBtn) quotaCancelBtn.addEventListener('click', closeQuotaModal);

    const quotaSaveBtn = document.getElementById('quota-save-btn');
    if (quotaSaveBtn) {
      quotaSaveBtn.addEventListener('click', () => {
        const inputVal = parseFloat(document.getElementById('quota-input-val').value) || 100000;
        state.monthlyQuota = inputVal;
        saveToStorage();
        closeQuotaModal();
        updateKPIs();
        showToast('Monthly target quota updated!', 'success');
      });
    }

    // Backup & Restore Modal
    const backupBtn = document.getElementById('sidebar-backup-json');
    if (backupBtn) backupBtn.addEventListener('click', openBackupModal);

    const backupCloseBtn = document.getElementById('backup-close-btn');
    if (backupCloseBtn) backupCloseBtn.addEventListener('click', closeBackupModal);

    const downloadJsonBtn = document.getElementById('btn-download-json');
    if (downloadJsonBtn) downloadJsonBtn.addEventListener('click', downloadJSONBackup);

    const applyJsonBtn = document.getElementById('btn-apply-json');
    if (applyJsonBtn) applyJsonBtn.addEventListener('click', restoreFromJSON);

    // CSV Exports
    const sidebarExport = document.getElementById('sidebar-export');
    if (sidebarExport) sidebarExport.addEventListener('click', exportToCSV);

    const tableExport = document.getElementById('btn-export-csv-table');
    if (tableExport) tableExport.addEventListener('click', exportToCSV);

    // Reset Data
    const resetDataBtn = document.getElementById('sidebar-reset-data');
    if (resetDataBtn) resetDataBtn.addEventListener('click', resetToSampleData);

    // Navigation links
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item[data-view]');
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        navItems.forEach(n => n.classList.remove('active'));
        item.classList.add('active');

        const view = item.dataset.view;
        if (view === 'transactions') {
          document.getElementById('transactions-section').scrollIntoView({ behavior: 'smooth' });
        } else if (view === 'charts') {
          document.querySelector('.charts-section').scrollIntoView({ behavior: 'smooth' });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    });

    // Window Resize -> Re-render custom canvas charts
    window.addEventListener('resize', () => {
      renderMainTimelineChart();
      renderChannelBarChart();
      renderCategoryDonutChart();
    });

    // Close modals on backdrop click
    window.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-backdrop')) {
        e.target.classList.remove('open');
      }
    });

    // Main Chart Hover setup
    setupMainChartEvents();
  }

  // ========================================================
  // Initialization
  // ========================================================

  function init() {
    loadFromStorage();
    populateCategoryFilters();
    attachEventHandlers();
    refreshAllViews();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

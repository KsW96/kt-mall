document.addEventListener('DOMContentLoaded', () => {
  // Sidebar Elements
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebarToggleIcon = document.getElementById('sidebarToggleIcon');
  const sidebar = document.getElementById('sidebarMenu');
  const sidebarCollapseBtn = document.getElementById('sidebarCollapseBtn');
  const sidebarCloseMobile = document.getElementById('sidebarCloseMobile');

  // 모바일 백드롭 생성 및 바인딩
  let backdrop = document.getElementById('sidebarBackdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'sidebarBackdrop';
    backdrop.className = 'sidebar-backdrop';
    document.body.appendChild(backdrop);
  }

  // 사이드바 토글 버튼 UI 갱신 함수
  const updateSidebarToggleUI = (isCollapsed) => {
    if (!sidebarToggle) return;
    if (isCollapsed) {
      sidebarToggle.setAttribute('title', '사이드바 펼치기');
      sidebarToggle.classList.add('active');
      if (sidebarToggleIcon) {
        sidebarToggleIcon.className = 'bi bi-layout-sidebar fs-6';
      }
    } else {
      sidebarToggle.setAttribute('title', '사이드바 접기 (화면 넓게 보기)');
      sidebarToggle.classList.remove('active');
      if (sidebarToggleIcon) {
        sidebarToggleIcon.className = 'bi bi-layout-sidebar-inset fs-6';
      }
    }
  };

  // 초기 상태 로드 (데스크탑 기준)
  const isDesktop = () => window.innerWidth >= 768;
  const savedCollapsed = localStorage.getItem('admin_sidebar_collapsed') === 'true';

  if (isDesktop() && savedCollapsed) {
    document.body.classList.add('sidebar-collapsed');
    document.documentElement.classList.add('sidebar-collapsed');
    updateSidebarToggleUI(true);
  } else {
    updateSidebarToggleUI(false);
  }

  // 사이드바 접기/열기 동작 (데스크탑)
  const setSidebarCollapsed = (collapse) => {
    if (collapse) {
      document.body.classList.add('sidebar-collapsed');
      document.documentElement.classList.add('sidebar-collapsed');
      localStorage.setItem('admin_sidebar_collapsed', 'true');
      updateSidebarToggleUI(true);
    } else {
      document.body.classList.remove('sidebar-collapsed');
      document.documentElement.classList.remove('sidebar-collapsed');
      localStorage.setItem('admin_sidebar_collapsed', 'false');
      updateSidebarToggleUI(false);
    }
  };

  // 모바일 사이드바 닫기 함수
  const closeMobileSidebar = () => {
    if (sidebar) sidebar.classList.remove('show');
    if (backdrop) backdrop.classList.remove('show');
  };

  // 상단 헤더 토글 버튼 클릭 이벤트
  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', (e) => {
      e.preventDefault();
      if (isDesktop()) {
        const willCollapse = !document.body.classList.contains('sidebar-collapsed');
        setSidebarCollapsed(willCollapse);
      } else {
        // 모바일 모드: 슬라이드 드로어 토글
        const isOpen = sidebar && sidebar.classList.contains('show');
        if (isOpen) {
          closeMobileSidebar();
        } else {
          if (sidebar) sidebar.classList.add('show');
          if (backdrop) backdrop.classList.add('show');
        }
      }
    });
  }

  // 사이드바 내부 접기 버튼 (데스크탑 전용)
  if (sidebarCollapseBtn) {
    sidebarCollapseBtn.addEventListener('click', (e) => {
      e.preventDefault();
      setSidebarCollapsed(true);
    });
  }

  // 모바일 사이드바 닫기 버튼
  if (sidebarCloseMobile) {
    sidebarCloseMobile.addEventListener('click', (e) => {
      e.preventDefault();
      closeMobileSidebar();
    });
  }

  // 모바일 백드롭 클릭 시 사이드바 닫기
  if (backdrop) {
    backdrop.addEventListener('click', () => {
      closeMobileSidebar();
    });
  }

  // 창 크기 변경 시 모바일 열림 상태 리셋
  window.addEventListener('resize', () => {
    if (isDesktop()) {
      closeMobileSidebar();
      const isCollapsed = localStorage.getItem('admin_sidebar_collapsed') === 'true';
      if (isCollapsed) {
        document.body.classList.add('sidebar-collapsed');
        document.documentElement.classList.add('sidebar-collapsed');
        updateSidebarToggleUI(true);
      } else {
        document.body.classList.remove('sidebar-collapsed');
        document.documentElement.classList.remove('sidebar-collapsed');
        updateSidebarToggleUI(false);
      }
    }
  });

  // Bootstrap 5 Tooltip 전역 초기화 (data-bs-toggle="tooltip")
  if (window.bootstrap && bootstrap.Tooltip) {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.forEach((tooltipTriggerEl) => {
      new bootstrap.Tooltip(tooltipTriggerEl, {
        trigger: 'hover',
        boundary: 'window'
      });
    });
  }

  // ==========================================
  // 스마트 자동 새로고침 (Auto-Reload Engine)
  // ==========================================
  let autoReloadTimer = null;
  let currentDataVersion = null;

  // 현재 페이지 키 식별 함수
  const getCurrentPageKey = () => {
    const path = window.location.pathname;
    if (path.startsWith('/users')) return 'users';
    if (path.startsWith('/activations')) return 'activations';
    if (path.startsWith('/user-activations')) return 'user-activations';
    if (path.startsWith('/notifications/sms')) return 'notification-sms';
    if (path.startsWith('/notifications/history')) return 'notification-history';
    if (path.startsWith('/system/menus')) return 'system-menus';
    if (path.startsWith('/system/configs')) return 'system-configs';
    if (path.startsWith('/data')) return 'data';
    return 'dashboard';
  };

  // 현재 사용자가 폼 입력이나 모달 작업 중인지 검사 (작업 보호)
  const isSafeToReload = () => {
    // 1. 모달이 열려있는 경우 새로고침 금지
    if (document.querySelector('.modal.show')) return false;

    // 2. 인풋이나 텍스트에어리어에 포커스가 있고 값이 입력 중인 경우 새로고침 금지
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
      if (activeEl.value && activeEl.value.trim().length > 0) return false;
    }

    return true;
  };

  // 플로팅 토스트 표시 / 닫기
  window.showDataChangeToast = () => {
    const toast = document.getElementById('dataChangeToast');
    if (toast) toast.classList.remove('d-none');
  };

  window.dismissDataChangeToast = () => {
    const toast = document.getElementById('dataChangeToast');
    if (toast) toast.classList.add('d-none');
  };

  // 초경량 데이터 버전 체크 함수
  const checkVersionAndReload = async () => {
    try {
      const pageKey = getCurrentPageKey();
      const res = await fetch(`/api/system/check-version?page=${pageKey}&t=${Date.now()}`);
      if (!res.ok) return;

      const data = await res.json();
      if (!data.success || !data.version) return;

      if (!currentDataVersion) {
        // 첫 실행 시 초기 버전 기억
        currentDataVersion = data.version;
        return;
      }

      // 버전이 변경되었을 때
      if (currentDataVersion !== data.version) {
        currentDataVersion = data.version;

        if (isSafeToReload()) {
          // 유휴 상태일 때 자동 새로고침
          console.log('[Auto-Reload] 데이터 변경 감지: 자동 새로고침 실행');
          location.reload();
        } else {
          // 작업 중일 때는 안전하게 플로팅 토스트 안내
          console.log('[Auto-Reload] 데이터 변경 감지: 사용자가 작업 중이므로 토스트 표시');
          showDataChangeToast();
        }
      }
    } catch (e) {
      // 통신 에러 시 조용히 무시 (네트워크 방해 금지)
    }
  };

  // 새로고침 타이머 재시작
  const restartAutoReloadTimer = () => {
    if (autoReloadTimer) clearInterval(autoReloadTimer);

    const mode = localStorage.getItem('admin_autoreload_mode') || 'smart';

    if (mode === 'off') {
      return;
    }

    if (mode === 'smart') {
      // 스마트 모드: 15초마다 초경량 버전 체크
      checkVersionAndReload();
      autoReloadTimer = setInterval(checkVersionAndReload, 15000);
    } else {
      // 시간 주기 모드 (1m, 3m, 5m)
      let ms = 180000; // 3분 기본
      if (mode === '1m') ms = 60000;
      else if (mode === '5m') ms = 300000;

      autoReloadTimer = setInterval(() => {
        if (isSafeToReload()) {
          location.reload();
        } else {
          showDataChangeToast();
        }
      }, ms);
    }
  };

  // 새로고침 모드 설정 전역 함수
  window.setAutoReloadMode = (mode) => {
    localStorage.setItem('admin_autoreload_mode', mode);

    const label = document.getElementById('autoReloadLabel');
    const icon = document.getElementById('autoReloadIcon');
    const checks = document.querySelectorAll('.auto-reload-check');

    checks.forEach(c => {
      if (c.dataset.mode === mode) c.classList.remove('d-none');
      else c.classList.add('d-none');
    });

    const labels = {
      'smart': '자동갱신: 스마트',
      '1m': '자동갱신: 1분',
      '3m': '자동갱신: 3분',
      '5m': '자동갱신: 5분',
      'off': '자동갱신: OFF'
    };

    if (label) label.textContent = labels[mode] || '자동갱신';

    if (mode === 'off') {
      if (icon) icon.className = 'bi bi-pause-circle text-danger';
    } else {
      if (icon) icon.className = 'bi bi-arrow-repeat text-light';
    }

    restartAutoReloadTimer();
  };

  // 초기 모드 복원 및 타이머 시작 (기본값: smart)
  const initialMode = localStorage.getItem('admin_autoreload_mode') || 'smart';
  setAutoReloadMode(initialMode);

  // ========================================================
  // 공통 데이터 포맷팅 유틸리티 (입력 시 숫자 연달아 입력 -> 표출/입력 완료 시 상황별 자동 포맷팅)
  // ========================================================
  window.AppFormatters = {
    // 1. 전화번호 포맷터 (01012345678 -> 010-1234-5678, 쉼표 다중 번호 지원)
    formatPhone: function(value) {
      if (!value) return '';
      const str = String(value);
      if (str.includes(',')) {
        return str.split(',').map(s => this.formatSinglePhone(s)).join(', ');
      }
      return this.formatSinglePhone(str);
    },

    formatSinglePhone: function(val) {
      const raw = String(val).replace(/[^0-9]/g, '');
      if (!raw) return '';
      if (raw.length === 11) {
        return raw.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
      } else if (raw.length === 10) {
        if (raw.startsWith('02')) {
          return raw.replace(/(\d{2})(\d{4})(\d{4})/, '$1-$2-$3');
        } else {
          return raw.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
        }
      } else if (raw.length === 9 && raw.startsWith('02')) {
        return raw.replace(/(\d{2})(\d{3})(\d{4})/, '$1-$2-$3');
      } else if (raw.length === 8) {
        return raw.replace(/(\d{4})(\d{4})/, '$1-$2');
      }
      return raw;
    },

    // 2. 생년월일 / 일자 포맷터 (19900515 -> 1990-05-15, 900515 -> 1990-05-15)
    formatBirthOrDate: function(val) {
      if (!val) return '';
      const raw = String(val).replace(/[^0-9]/g, '');
      if (raw.length === 8) {
        return raw.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');
      } else if (raw.length === 6) {
        const yy = parseInt(raw.substring(0, 2), 10);
        const prefix = (yy <= 30) ? '20' : '19';
        return `${prefix}${raw.substring(0, 2)}-${raw.substring(2, 4)}-${raw.substring(4, 6)}`;
      }
      return val;
    },

    // 3. 금액 / 돈 포맷터 (7000 -> 7,000원, 850000 -> 850,000원)
    formatCurrency: function(val, appendWon = false) {
      if (val === null || val === undefined || val === '') return '';
      const raw = String(val).replace(/[^0-9]/g, '');
      if (!raw) return '';
      const num = parseInt(raw, 10);
      const formatted = num.toLocaleString('ko-KR');
      return appendWon ? `${formatted}원` : formatted;
    },

    // 숫자만 추출
    rawDigits: function(val) {
      return String(val || '').replace(/[^0-9]/g, '');
    }
  };

  // DOM 입력창 자동 포맷팅 바인딩 함수
  window.initAutoFormatters = function(container = document) {
    // 1. 전화번호 입력창: focus 시 숫자만, blur 시 하이픈 포맷팅
    const phoneSelectors = 'input[data-format="phone"], .format-phone, input[name="phone"], input[name="phone_num"], #sendReceiverInput, #editUserPhone';
    container.querySelectorAll(phoneSelectors).forEach(input => {
      if (input._formatterBound) return;
      input._formatterBound = true;

      input.addEventListener('focus', function() {
        const digits = this.value.replace(/[^0-9,]/g, '');
        if (digits) this.value = digits;
      });
      input.addEventListener('blur', function() {
        this.value = AppFormatters.formatPhone(this.value);
      });
      if (input.value) {
        input.value = AppFormatters.formatPhone(input.value);
      }
    });

    // 2. 생년월일 / 일자 입력창: focus 시 숫자만, blur 시 YYYY-MM-DD
    const dateSelectors = 'input[data-format="date"], .format-date, input[name="birth_dt"], #varSampleDate, #editUserBirthDt, #act_birth_dt';
    container.querySelectorAll(dateSelectors).forEach(input => {
      if (input._formatterBound) return;
      input._formatterBound = true;

      input.addEventListener('focus', function() {
        const digits = this.value.replace(/[^0-9]/g, '');
        if (digits) this.value = digits;
      });
      input.addEventListener('blur', function() {
        this.value = AppFormatters.formatBirthOrDate(this.value);
      });
      if (input.value) {
        input.value = AppFormatters.formatBirthOrDate(input.value);
      }
    });

    // 3. 금액 / 포인트 입력창: focus 시 숫자만, blur 시 3자리 콤마 처리
    const currencySelectors = 'input[data-format="currency"], .format-currency, input[name="point"], #varSamplePrice, #editUserPoint, #act_installment_principal, #act_factory_price';
    container.querySelectorAll(currencySelectors).forEach(input => {
      if (input._formatterBound) return;
      input._formatterBound = true;

      const withWon = input.dataset.won === 'true';
      input.addEventListener('focus', function() {
        const digits = this.value.replace(/[^0-9]/g, '');
        if (digits) this.value = digits;
      });
      input.addEventListener('blur', function() {
        if (this.value) {
          this.value = AppFormatters.formatCurrency(this.value, withWon);
        }
      });
      if (input.value) {
        input.value = AppFormatters.formatCurrency(input.value, withWon);
      }
    });
  };

  // 모달이 열릴 때 내부 인풋 필드들 자동 포맷팅 적용
  document.addEventListener('shown.bs.modal', (e) => {
    if (e.target) {
      window.initAutoFormatters(e.target);
    }
  });

  // 초기 자동 바인딩 실행
  initAutoFormatters();
});


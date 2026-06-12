// 画面切り替えスクリプト
      function switchScreen(id) {
        // 画面切り替え時に通知やポップアップを閉じる
        document.getElementById('app-notif-dropdown').classList.remove('active');
        closeDatePicker();

        document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
        const targetScreen = document.getElementById('screen-' + id);
        if (targetScreen) targetScreen.classList.add('active');

        document.querySelectorAll('.mnav-btn').forEach((b) => {
          b.classList.remove('active');
          if (b.getAttribute('onclick').includes(`'${id}'`)) {
            b.classList.add('active');
          }
        });

        document
          .querySelectorAll('.sidebar-submenu li')
          .forEach((li) => li.classList.remove('active'));

        let subClass = '';
        if (id.startsWith('schedule')) subClass = '.sub-schedule';
        else if (id.startsWith('task')) subClass = '.sub-task';
        else if (id.startsWith('collab')) subClass = '.sub-collab';
        else if (id === 'members') subClass = '.sub-members';
        else if (id.startsWith('settings-task')) subClass = '.sub-settings-task';

        if (subClass) {
          const li = document.querySelector(subClass);
          if (li) {
            li.classList.add('active');
            openDropdown(li.closest('.sidebar-dropdown'));
          }
        }
      }

      // サイドバー開閉
      function toggleSidebar() {
        document.getElementById('app-sidebar').classList.toggle('collapsed');
      }

      // サイドバーアコーディオン
      document.querySelectorAll('.sidebar-dropdown > a').forEach((el) => {
        el.addEventListener('click', function (e) {
          e.preventDefault();
          const sidebar = document.getElementById('app-sidebar');
          if (sidebar.classList.contains('collapsed')) sidebar.classList.remove('collapsed');

          const li = this.parentElement;
          if (li.classList.contains('active')) {
            li.classList.remove('active');
            this.nextElementSibling.style.display = 'none';
          } else {
            openDropdown(li);
          }
        });
      });

      function openDropdown(dropdownElement) {
        document.querySelectorAll('.sidebar-dropdown').forEach((d) => {
          d.classList.remove('active');
          if (d.querySelector('.sidebar-submenu'))
            d.querySelector('.sidebar-submenu').style.display = 'none';
        });
        dropdownElement.classList.add('active');
        if (dropdownElement.querySelector('.sidebar-submenu'))
          dropdownElement.querySelector('.sidebar-submenu').style.display = 'block';
      }

      // 通知ドロップダウン制御
      function toggleNotif() {
        const notif = document.getElementById('app-notif-dropdown');
        notif.classList.toggle('active');
      }

      // 候補日程 DatePicker 制御
      function openDatePicker() {
        document.getElementById('date-picker-popup').classList.add('active');
      }
      function closeDatePicker() {
        document.getElementById('date-picker-popup').classList.remove('active');
      }

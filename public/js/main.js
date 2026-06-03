document.addEventListener('DOMContentLoaded', function () {
  // User dropdown toggle
  var dropdownBtn = document.querySelector('.nav-user-btn');
  var dropdownMenu = document.querySelector('.dropdown-menu');
  if (dropdownBtn && dropdownMenu) {
    dropdownBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      dropdownMenu.classList.toggle('show');
    });
    document.addEventListener('click', function () {
      dropdownMenu.classList.remove('show');
    });
  }

  // Mobile menu toggle
  var mobileToggle = document.getElementById('mobileMenuToggle');
  var mobileMenu = document.getElementById('mobileMenu');
  if (mobileToggle && mobileMenu) {
    mobileToggle.addEventListener('click', function () {
      mobileMenu.classList.toggle('show');
    });
  }

  // Format numbers
  document.querySelectorAll('[data-format-number]').forEach(function (el) {
    var num = parseInt(el.textContent);
    if (!isNaN(num)) {
      if (num >= 1000000) {
        el.textContent = (num / 1000000).toFixed(1) + 'M';
      } else if (num >= 1000) {
        el.textContent = (num / 1000).toFixed(1) + 'K';
      }
    }
  });

  // Quote reply
  document.querySelectorAll('.quote-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var postId = this.dataset.postId;
      var quoteInput = document.getElementById('quotePostId');
      var replyBox = document.querySelector('.reply-textarea');
      if (quoteInput) quoteInput.value = postId;
      if (replyBox) {
        replyBox.focus();
        replyBox.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
});

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function timeAgo(dateStr) {
  var date = new Date(dateStr);
  var now = new Date();
  var diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff / 60) + ' minutes ago';
  if (diff < 86400) return Math.floor(diff / 3600) + ' hours ago';
  if (diff < 2592000) return Math.floor(diff / 86400) + ' days ago';
  return date.toLocaleDateString();
}

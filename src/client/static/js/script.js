document.addEventListener('DOMContentLoaded', function() {

    document.querySelectorAll('.flash-close').forEach(function(closeBtn) {
        closeBtn.addEventListener('click', function() {
            closeBtn.closest('.flash').style.display = 'none';
        });
    });
    // Close alert messages
    document.querySelectorAll('.alert-close').forEach(button => {
        button.addEventListener('click', function() {
            this.closest('.alert').style.opacity = '0';
            setTimeout(() => {
                this.closest('.alert').remove();
            }, 300);
        });
    });

    // Auto-hide alerts after 5 seconds
    setTimeout(() => {
        document.querySelectorAll('.alert').forEach(alert => {
            alert.style.opacity = '0';
            setTimeout(() => {
                alert.remove();
            }, 300);
        });
    }, 5000);

    // Confirm before deleting
    document.querySelectorAll('.btn-danger').forEach(button => {
        button.addEventListener('click', function(e) {
            if (!confirm('Are you sure you want to delete this user?')) {
                e.preventDefault();
            }
        });
    });
});

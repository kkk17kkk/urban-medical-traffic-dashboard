document.addEventListener('DOMContentLoaded', function() {
    // 获取所有删除按钮
    var deleteButtons = document.querySelectorAll('.delete-btn');
    deleteButtons.forEach(function(button) {
        button.addEventListener('click', function(event) {
            event.preventDefault(); // 阻止链接默认行为

            var hospitalId = this.getAttribute('data-hospital-id');
            var row = this.closest('.table-row'); 

            // 发送异步请求到Django后端进行删除操作
            fetch('/delete/' + hospitalId + '/', { 
                method: 'DELETE',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                }
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('网络响应错误');
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    // 如果删除成功，删除DOM中的行，并显示消息
                    row.remove();
                    alert('医院已停用');
                } else {
                    alert('删除失败：' + data.message);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('删除时发生错误：' + error.message);
            });
        });
    });
});

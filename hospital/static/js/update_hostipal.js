/* 显示修改医院模态窗 */
var updateModal = document.getElementById("updateHospitalModal");
var updateCloseBtn = document.querySelector(".update-close");

function openUpdateHospitalModal() {
    updateModal.style.display = "block";
}

/* 关闭修改医院模态窗 */
updateCloseBtn.onclick = function() {
    updateModal.style.display = "none";
}

// 获取所有的修改按钮
// 获取修改按钮并添加点击事件
var updateButtons = document.querySelectorAll('.update-btn');
updateButtons.forEach(function(button) {
    button.addEventListener('click', function() {
        var hospitalId = this.getAttribute('data-hospital-id'); // 获取医院ID
        fetch(`/get_hospital_info/${hospitalId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                if (data) { // 确保data不为空
                    // 填充表单数据
                    document.getElementById('updateHospitalId').value = data.id;
                    document.getElementById('updateHospitalName').value = data.h_name;
                    document.getElementById('updateHospitalArea').value = data.h_area;
                    document.getElementById('updateHospitalType').value = data.h_type;
                    document.getElementById('updateHospitalLng').value = data.h_lng;
                    document.getElementById('updateHospitalLat').value = data.h_lat;
                    openUpdateHospitalModal(); // 显示模态框
                } else {
                    console.error('No data received or data is empty');
                }
            })
            .catch(error => {
                console.error('Error fetching hospital info:', error);
            });
    });
});


// 表单提交事件
document.getElementById('updateHospitalForm').addEventListener('submit', function(event) {
    event.preventDefault(); // 阻止表单默认提交行为
    var formData = new FormData(this);
    
    // 发送POST请求到后端
    fetch(this.action, {
        method: 'POST',
        body: formData,
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
        }
    })
    .then(response => response.json().then(data => ({ok: response.ok, data: data})))
    .then(result => {
        var data = result.data;
        if (result.ok && data.success) {
            alert('医院信息更新成功！');
            document.getElementById('updateHospitalModal').style.display = 'none';
            // 刷新页面或重新加载医院信息
            location.reload();
        } else {
            alert('更新失败：' + (data.message || '未知错误'));
        }
    })
    .catch(error => console.error('Error updating hospital info:', error));
});

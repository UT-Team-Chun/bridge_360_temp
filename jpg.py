import os

def rename_jpg_files(directory='.'):
    # 遍历指定目录
    for filename in os.listdir(directory):
        # 检查文件是否以.JPG结尾（区分大小写）
        if filename.endswith('.JPG'):
            # 构建旧文件和新文件的完整路径
            old_file = os.path.join(directory, filename)
            # 将文件扩展名改为小写
            new_file = os.path.join(directory, filename[:-4] + '.jpg')
            
            try:
                os.rename(old_file, new_file)
                print(f'已重命名: {filename} -> {filename[:-4]}.jpg')
            except OSError as e:
                print(f'重命名 {filename} 时出错: {e}')

# 在当前目录执行
rename_jpg_files('bridge1_20241103\images')
package in.bqube.bazaarkhabar;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/** HTML file ko phone ke Downloads folder mein save karta hai (koi permission nahi chahiye). */
@CapacitorPlugin(name = "SaveFile")
public class SaveFilePlugin extends Plugin {

    @PluginMethod
    public void saveHtml(PluginCall call) {
        String name = call.getString("name");
        String data = call.getString("data");
        if (name == null || data == null || !name.matches("[A-Za-z0-9_.-]{1,80}")) {
            call.reject("naam ya data galat hai");
            return;
        }
        if (Build.VERSION.SDK_INT < 29) {
            call.reject("Is Android version par Downloads mein save support nahi hai");
            return;
        }
        try {
            ContentResolver resolver = getContext().getContentResolver();
            ContentValues values = new ContentValues();
            values.put(MediaStore.MediaColumns.DISPLAY_NAME, name);
            values.put(MediaStore.MediaColumns.MIME_TYPE, "text/html");
            values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
            Uri uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
            if (uri == null) {
                call.reject("File nahi ban saki");
                return;
            }
            try (OutputStream os = resolver.openOutputStream(uri)) {
                if (os == null) {
                    call.reject("File nahi khul saki");
                    return;
                }
                os.write(data.getBytes(StandardCharsets.UTF_8));
            }
            JSObject ret = new JSObject();
            ret.put("uri", uri.toString());
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Save nahi hua: " + e.getMessage());
        }
    }
}

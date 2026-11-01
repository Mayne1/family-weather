import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = FamilyBridgeViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}

import WidgetKit

class FamilyBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(ResponseWidgetsPlugin())
    }
}

@objc(ResponseWidgetsPlugin)
public class ResponseWidgetsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ResponseWidgetsPlugin"
    public let jsName = "ResponseWidgets"
    public let pluginMethods: [CAPPluginMethod] = [CAPPluginMethod(name: "save", returnType: CAPPluginReturnPromise)]
    @objc func save(_ call: CAPPluginCall) {
        guard let defaults = UserDefaults(suiteName: "group.com.thefamilyweather.app") else { call.reject("Widget shared storage unavailable"); return }
        let signedIn = call.getBool("signedIn") ?? false
        var clean: [String: Any] = ["signedIn": signedIn]
        if signedIn, let data = call.getObject("summary") {
            for key in ["announcements", "announcementReplies", "events", "going", "maybe", "declined", "waiting"] {
                guard let n = data[key] as? NSNumber, n.doubleValue.isFinite, n.doubleValue >= 0, n.doubleValue <= 10000000, n.doubleValue.rounded() == n.doubleValue else { call.reject("Invalid response count"); return }
                clean[key] = n.intValue
            }
            guard let checked = data["checkedAt"] as? NSNumber, checked.doubleValue.isFinite, checked.doubleValue > 0, checked.doubleValue <= Date().timeIntervalSince1970 * 1000 + 300000 else { call.reject("Invalid snapshot time"); return }
            clean["checkedAt"] = checked.doubleValue
            clean["partial"] = data["partial"] as? Bool ?? false
        }
        do {
            defaults.set(try JSONSerialization.data(withJSONObject: clean), forKey: "responses-snapshot")
            WidgetCenter.shared.reloadTimelines(ofKind: "FamilyWeatherResponses")
            call.resolve()
        } catch { call.reject("Could not update response widget") }
    }
}

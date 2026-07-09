/*******************************************************************************************************
 *
 * LspApplication.java, in gama.lsp, is part of the source code of the GAMA modeling and simulation platform
 * (v.2025-03).
 *
 * (c) 2007-2025 UMI 209 UMMISCO IRD/SU & Partners (IRIT, MIAT, ESPACE-DEV, CTU)
 *
 * Visit https://github.com/gama-platform/gama for license information and contacts.
 *
 ********************************************************************************************************/
package gama.lsp;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

import org.eclipse.equinox.app.IApplication;
import org.eclipse.equinox.app.IApplicationContext;

import com.google.inject.Injector;

import gama.core.runtime.GAMA;
import gama.core.runtime.NullGuiHandler;
import gama.core.runtime.exceptions.GamaRuntimeException;
import gama.dev.DEBUG;
import gaml.compiler.GamlStandaloneSetup;

/**
 * Eclipse IApplication entry point for the GAMA LSP validation service.
 * Supports:
 * <ul>
 * <li>{@code -validate-server} -- persistent stdin/stdout validation server</li>
 * <li>{@code -validate-gaml <file>} -- one-shot GAML file validation</li>
 * </ul>
 */
public class LspApplication implements IApplication {

	public static final String VALIDATE_GAML_PARAMETER = "-validate-gaml";
	public static final String VALIDATE_SERVER_PARAMETER = "-validate-server";
	public static final String HELP_PARAMETER = "-help";

	static Injector INJECTOR;

	public static Injector getInjector() { return configureInjector(); }

	private static synchronized Injector configureInjector() {
		if (INJECTOR != null) return INJECTOR;
		DEBUG.LOG("GAMA LSP configuring and loading...");
		System.setProperty("java.awt.headless", "true");
		GAMA.setHeadLessMode(true);
		GAMA.setHeadlessGui(new NullGuiHandler());
		try {
			INJECTOR = GamlStandaloneSetup.doSetup();
		} catch (final Exception e1) {
			throw GamaRuntimeException.create(e1, GAMA.getRuntimeScope());
		}
		return INJECTOR;
	}

	@Override
	public Object start(final IApplicationContext context) throws Exception {
		final Map<String, String[]> mm = context.getArguments();
		final List<String> args = Arrays.asList(mm.get("application.args"));

		if (args.contains(HELP_PARAMETER)) {
			showHelp();
			System.exit(0);
		}

		configureInjector();
		DEBUG.OFF();

		final GamlValidationService service = new GamlValidationService(INJECTOR);

		if (args.contains(VALIDATE_GAML_PARAMETER)) {
			final String file = args.get(args.size() - 1);
			final String result = service.validateGamlFile(file);
			System.out.println(result);
			System.exit(0);
		}

		if (args.contains(VALIDATE_SERVER_PARAMETER)) {
			service.runValidationServer();
			return null;
		}

		showHelp();
		System.exit(0);
		return null;
	}

	@Override
	public void stop() {}

	private void showHelp() {
		DEBUG.ON();
		DEBUG.LOG("GAMA LSP Service\n"
				+ "\nAvailable options:\n"
				+ "\t" + VALIDATE_GAML_PARAMETER + " [gamlFile.gaml]   Validate a single GAML file\n"
				+ "\t" + VALIDATE_SERVER_PARAMETER + "              Start persistent validation server (stdin/stdout)\n"
				+ "\t" + HELP_PARAMETER + "                         Show this help");
		DEBUG.OFF();
	}
}
